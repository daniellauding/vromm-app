-- Comprehensive cleanup of invitation system
-- Run this to fix duplicate invitations and orphaned notifications

-- 1. Show current status before cleanup
SELECT 'BEFORE CLEANUP - Invitation Status:' as info;
SELECT 
  status,
  COUNT(*) as count
FROM pending_invitations 
GROUP BY status
ORDER BY status;

SELECT 'BEFORE CLEANUP - Notification Status:' as info;
SELECT 
  type,
  COUNT(*) as count
FROM notifications 
WHERE type IN ('supervisor_invitation', 'student_invitation')
GROUP BY type
ORDER BY type;

-- 2. Clean up duplicate pending invitations (keep only the latest from each inviter to each email)
DELETE FROM pending_invitations 
WHERE id NOT IN (
  SELECT DISTINCT ON (email, invited_by, status) id
  FROM pending_invitations
  WHERE status = 'pending'
  ORDER BY email, invited_by, status, created_at DESC
) AND status = 'pending';

-- 3. Mark invitations as 'accepted' if relationship already exists
UPDATE pending_invitations 
SET 
  status = 'accepted',
  accepted_at = NOW(),
  updated_at = NOW()
WHERE status = 'pending' 
AND EXISTS (
  SELECT 1 FROM student_supervisor_relationships ssr
  INNER JOIN profiles p ON p.email = pending_invitations.email
  WHERE (ssr.student_id = p.id AND ssr.supervisor_id = pending_invitations.invited_by)
     OR (ssr.supervisor_id = p.id AND ssr.student_id = pending_invitations.invited_by)
);

-- 4. Clean up orphaned notifications (notifications without valid invitation_id)
DELETE FROM notifications 
WHERE type IN ('supervisor_invitation', 'student_invitation')
AND (
  metadata->>'invitation_id' IS NULL 
  OR NOT EXISTS (
    SELECT 1 FROM pending_invitations pi 
    WHERE pi.id::text = metadata->>'invitation_id'
  )
);

-- 5. Clean up notifications for accepted invitations
DELETE FROM notifications n
WHERE type IN ('supervisor_invitation', 'student_invitation')
AND EXISTS (
  SELECT 1 FROM pending_invitations pi 
  WHERE pi.id::text = n.metadata->>'invitation_id'
  AND pi.status = 'accepted'
);

-- 6. Show status after cleanup
SELECT 'AFTER CLEANUP - Invitation Status:' as info;
SELECT 
  status,
  COUNT(*) as count
FROM pending_invitations 
GROUP BY status
ORDER BY status;

SELECT 'AFTER CLEANUP - Notification Status:' as info;
SELECT 
  type,
  COUNT(*) as count
FROM notifications 
WHERE type IN ('supervisor_invitation', 'student_invitation')
GROUP BY type
ORDER BY type;

-- 7. Show remaining pending invitations for daniel+student@lauding.se
SELECT 'REMAINING PENDING INVITATIONS:' as info;
SELECT 
  pi.id,
  pi.email,
  pi.status,
  pi.created_at,
  pi.metadata->>'relationshipType' as relationship_type,
  inviter.full_name as inviter_name,
  inviter.email as inviter_email
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE pi.email = 'daniel+student@lauding.se'
  AND pi.status = 'pending'
ORDER BY pi.created_at DESC;

-- 8. Show existing relationships for daniel+student@lauding.se
SELECT 'EXISTING RELATIONSHIPS:' as info;
SELECT 
  ssr.id,
  ssr.status,
  ssr.created_at,
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
