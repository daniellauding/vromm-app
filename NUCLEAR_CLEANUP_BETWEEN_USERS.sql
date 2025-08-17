-- NUCLEAR CLEANUP - Completely reset invitation/relationship state between two users
-- Users: 06c73e75-0ef7-442b-acd0-ee204f83d1aa (daniel+handledare) and c16a364f-3bc4-4d60-bca9-460e977fddea (daniel+student)

SELECT '💣 NUCLEAR CLEANUP STARTING' as status;
SELECT '⚠️ This will completely reset all invitations and relationships between these users' as warning;

-- 1. Show what will be deleted
SELECT 'WILL DELETE - PENDING INVITATIONS:' as section;
SELECT 
  pi.id,
  pi.email,
  pi.invited_by,
  pi.status,
  pi.created_at,
  EXTRACT(EPOCH FROM (NOW() - pi.created_at)) / 3600 as hours_old
FROM pending_invitations pi
WHERE (pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND pi.email = 'daniel+student@lauding.se')
   OR (pi.invited_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND pi.email = 'daniel+handledare@lauding.se');

SELECT 'WILL DELETE - NOTIFICATIONS:' as section;
SELECT 
  n.id,
  n.user_id,
  n.actor_id,
  n.type,
  n.created_at
FROM notifications n
WHERE ((n.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND n.actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
    OR (n.user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND n.actor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'))
  AND n.type IN ('student_invitation', 'supervisor_invitation');

SELECT 'WILL DELETE - RELATIONSHIPS:' as section;
SELECT 
  ssr.id,
  ssr.student_id,
  ssr.supervisor_id,
  ssr.status,
  ssr.created_at
FROM student_supervisor_relationships ssr
WHERE (ssr.student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND ssr.supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
   OR (ssr.student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND ssr.supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea');

-- 2. DELETE EVERYTHING BETWEEN THESE USERS
SELECT '💥 STARTING DELETION...' as action;

-- Delete all notifications between these users
DELETE FROM notifications 
WHERE ((user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
    OR (user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND actor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'))
  AND type IN ('student_invitation', 'supervisor_invitation');

-- Delete all pending invitations between these users
DELETE FROM pending_invitations 
WHERE (invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND email = 'daniel+student@lauding.se')
   OR (invited_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND email = 'daniel+handledare@lauding.se');

-- Delete all relationships between these users
DELETE FROM student_supervisor_relationships 
WHERE (student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
   OR (student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea');

-- 3. Verify cleanup
SELECT '✅ AFTER NUCLEAR CLEANUP:' as status;

SELECT 'REMAINING INVITATIONS (should be 0):' as section;
SELECT COUNT(*) as remaining_invitations
FROM pending_invitations 
WHERE (invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND email = 'daniel+student@lauding.se')
   OR (invited_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND email = 'daniel+handledare@lauding.se');

SELECT 'REMAINING NOTIFICATIONS (should be 0):' as section;
SELECT COUNT(*) as remaining_notifications
FROM notifications 
WHERE ((user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
    OR (user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND actor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'))
  AND type IN ('student_invitation', 'supervisor_invitation');

SELECT 'REMAINING RELATIONSHIPS (should be 0):' as section;
SELECT COUNT(*) as remaining_relationships
FROM student_supervisor_relationships 
WHERE (student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
   OR (student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea');

SELECT '🎉 NUCLEAR CLEANUP COMPLETE!' as final_status;
SELECT '✅ You can now send a fresh invitation between these users' as result;
SELECT '🔄 Refresh the app and try inviting again' as instruction;
