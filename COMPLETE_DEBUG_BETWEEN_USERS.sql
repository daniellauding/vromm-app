-- COMPLETE DEBUG BETWEEN SPECIFIC USERS
-- Users: 06c73e75-0ef7-442b-acd0-ee204f83d1aa (daniel+handledare) and c16a364f-3bc4-4d60-bca9-460e977fddea (daniel+student)

SELECT '🔍 COMPLETE DEBUG REPORT' as title;
SELECT '===========================================' as separator;

-- 1. Show user details
SELECT '👥 USER DETAILS:' as section;
SELECT 
  'SUPERVISOR (INVITER)' as user_type,
  id,
  full_name,
  email,
  role
FROM profiles 
WHERE id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
UNION ALL
SELECT 
  'STUDENT (INVITEE)' as user_type,
  id,
  full_name,
  email,
  role
FROM profiles 
WHERE id = 'c16a364f-3bc4-4d60-bca9-460e977fddea';

-- 2. Show ALL pending invitations between these users (both directions)
SELECT '📤 ALL PENDING INVITATIONS BETWEEN USERS:' as section;
SELECT 
  pi.id,
  pi.email,
  pi.invited_by,
  pi.status,
  pi.created_at,
  pi.updated_at,
  pi.accepted_at,
  pi.accepted_by,
  EXTRACT(EPOCH FROM (NOW() - pi.created_at)) / 3600 as hours_old,
  pi.metadata->>'relationshipType' as relationship_type,
  pi.metadata->>'supervisorName' as supervisor_name,
  inviter.full_name as inviter_name,
  inviter.email as inviter_email,
  CASE 
    WHEN pi.status = 'pending' THEN '🟡 PENDING'
    WHEN pi.status = 'accepted' THEN '🟢 ACCEPTED'
    WHEN pi.status = 'rejected' THEN '🔴 REJECTED'
    WHEN pi.status = 'cancelled' THEN '⚫ CANCELLED'
    ELSE '❓ ' || pi.status
  END as status_emoji
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE (pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND pi.email = 'daniel+student@lauding.se')
   OR (pi.invited_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND pi.email = 'daniel+handledare@lauding.se')
ORDER BY pi.created_at DESC;

-- 3. Show existing relationships
SELECT '🤝 EXISTING RELATIONSHIPS:' as section;
SELECT 
  ssr.id,
  ssr.student_id,
  ssr.supervisor_id,
  ssr.status,
  ssr.created_at,
  student.full_name as student_name,
  student.email as student_email,
  supervisor.full_name as supervisor_name,
  supervisor.email as supervisor_email,
  CASE 
    WHEN ssr.status = 'active' THEN '🟢 ACTIVE'
    WHEN ssr.status = 'inactive' THEN '🟡 INACTIVE'
    ELSE '❓ ' || ssr.status
  END as status_emoji
FROM student_supervisor_relationships ssr
LEFT JOIN profiles student ON ssr.student_id = student.id
LEFT JOIN profiles supervisor ON ssr.supervisor_id = supervisor.id
WHERE (ssr.student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND ssr.supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
   OR (ssr.student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND ssr.supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea')
ORDER BY ssr.created_at DESC;

-- 4. Show ALL notifications between these users
SELECT '🔔 ALL NOTIFICATIONS BETWEEN USERS:' as section;
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
  n.metadata->>'relationship_type' as relationship_type,
  CASE 
    WHEN n.is_read THEN '📖 READ'
    ELSE '📩 UNREAD'
  END as read_status
FROM notifications n
WHERE ((n.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND n.actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
    OR (n.user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND n.actor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'))
  AND n.type IN ('student_invitation', 'supervisor_invitation')
ORDER BY n.created_at DESC;

-- 5. Check for orphaned notifications (notifications without valid invitation)
SELECT '🚨 ORPHANED NOTIFICATIONS (NO MATCHING INVITATION):' as section;
SELECT 
  n.id,
  n.user_id,
  n.actor_id,
  n.type,
  n.created_at,
  n.metadata->>'invitation_id' as invitation_id,
  'ORPHANED - Should be deleted' as issue
FROM notifications n
WHERE ((n.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND n.actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
    OR (n.user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND n.actor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'))
  AND n.type IN ('student_invitation', 'supervisor_invitation')
  AND (n.metadata->>'invitation_id' IS NULL 
       OR NOT EXISTS (
         SELECT 1 FROM pending_invitations pi 
         WHERE pi.id::text = n.metadata->>'invitation_id'
       ));

-- 6. What UI queries should return
SELECT '🖥️ WHAT PROFILESCREEN SHOULD SEE (checkForPendingInvitations):' as section;
SELECT 
  pi.id,
  pi.invited_by,
  'This is what ProfileScreen.checkForPendingInvitations queries' as note
FROM pending_invitations pi
WHERE pi.email = 'daniel+student@lauding.se'
  AND pi.status = 'pending';

SELECT '🖥️ WHAT RELATIONSHIP MODAL SHOULD SEE (getPendingInvitations):' as section;
SELECT 
  pi.id,
  pi.email,
  pi.role,
  pi.status,
  pi.created_at,
  'This is what RelationshipManagementModal.loadPendingInvitations queries' as note
FROM pending_invitations pi
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.status = 'pending';

SELECT '🖥️ WHAT INVITATION NOTIFICATION SHOULD SEE (loadPendingInvitations):' as section;
SELECT 
  pi.id,
  pi.email,
  pi.role,
  pi.invited_by,
  pi.metadata,
  pi.created_at,
  'This is what InvitationNotification.loadPendingInvitations queries' as note
FROM pending_invitations pi
WHERE pi.email = 'daniel+student@lauding.se'
  AND pi.status = 'pending'
ORDER BY pi.created_at DESC;

SELECT '🔧 SUMMARY OF ISSUES:' as section;
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM pending_invitations WHERE invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND email = 'daniel+student@lauding.se' AND status = 'pending') > 0 
    THEN '❌ HIDDEN PENDING INVITATION EXISTS - Not showing in UI'
    ELSE '✅ No pending invitations found'
  END as pending_invitation_issue,
  CASE 
    WHEN (SELECT COUNT(*) FROM notifications WHERE user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND type = 'student_invitation') > 1
    THEN '❌ DUPLICATE NOTIFICATIONS - Multiple notifications for same invitation'
    ELSE '✅ No duplicate notifications'
  END as notification_issue,
  CASE 
    WHEN EXISTS(SELECT 1 FROM student_supervisor_relationships WHERE (student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa') OR (student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'))
    THEN '❌ RELATIONSHIP ALREADY EXISTS - Invitations should be auto-accepted'
    ELSE '✅ No existing relationship'
  END as relationship_issue;

SELECT '🛠️ RECOMMENDED ACTIONS:' as section;
SELECT 
  '1. Run NUCLEAR_CLEANUP_BETWEEN_USERS.sql to completely reset' as action_1,
  '2. Or manually accept/reject the invitation shown above' as action_2,
  '3. Check if UI is filtering out valid invitations' as action_3;
