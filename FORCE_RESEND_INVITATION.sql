-- Force resend invitation by cleaning up old ones and allowing new invitation
-- This will let you send a fresh invitation between the two users

-- Target users:
-- Supervisor (inviter): 06c73e75-0ef7-442b-acd0-ee204f83d1aa (daniel+handledare@lauding.se)
-- Student (invitee): c16a364f-3bc4-4d60-bca9-460e977fddea (daniel+student@lauding.se)

-- 1. Show what's currently blocking the invitation
SELECT 'CURRENT BLOCKING INVITATIONS:' as status;
SELECT 
  pi.id,
  pi.email,
  pi.invited_by,
  pi.status,
  pi.created_at,
  pi.updated_at,
  EXTRACT(EPOCH FROM (NOW() - pi.created_at)) / 3600 as hours_old,
  pi.metadata->>'relationshipType' as relationship_type
FROM pending_invitations pi
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.email = 'daniel+student@lauding.se'
  AND pi.status = 'pending'
ORDER BY pi.created_at DESC;

-- 2. Check if relationship already exists
SELECT 'EXISTING RELATIONSHIP CHECK:' as status;
SELECT 
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM student_supervisor_relationships 
      WHERE (student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
         OR (student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea')
    ) THEN 'YES - Relationship exists'
    ELSE 'NO - No relationship exists'
  END as relationship_status;

-- 3. OPTION A: Cancel old invitations to allow new one (recommended)
UPDATE pending_invitations 
SET 
  status = 'cancelled',
  updated_at = NOW()
WHERE invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND email = 'daniel+student@lauding.se'
  AND status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour'; -- Only cancel invitations older than 1 hour

-- 4. Clean up related orphaned notifications
DELETE FROM notifications 
WHERE type = 'student_invitation'
  AND user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
  AND actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND (
    metadata->>'invitation_id' IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM pending_invitations pi 
      WHERE pi.id::text = metadata->>'invitation_id'
      AND pi.status = 'pending'
    )
  );

-- 5. Show what's left after cleanup
SELECT 'AFTER CLEANUP:' as status;
SELECT 
  pi.id,
  pi.email,
  pi.invited_by,
  pi.status,
  pi.created_at,
  EXTRACT(EPOCH FROM (NOW() - pi.created_at)) / 3600 as hours_old,
  'Should be able to invite now if no rows returned' as note
FROM pending_invitations pi
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.email = 'daniel+student@lauding.se'
  AND pi.status = 'pending'
ORDER BY pi.created_at DESC;

-- 6. Check notifications after cleanup
SELECT 'NOTIFICATIONS AFTER CLEANUP:' as status;
SELECT 
  n.id,
  n.user_id,
  n.actor_id,
  n.type,
  n.created_at,
  n.metadata->>'invitation_id' as invitation_id
FROM notifications n
WHERE n.type = 'student_invitation'
  AND n.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
  AND n.actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
ORDER BY n.created_at DESC;

SELECT '✅ You should now be able to send a new invitation!' as final_status;
