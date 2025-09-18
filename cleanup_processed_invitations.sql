-- Clean up processed invitations to prevent duplicates
-- This script marks notifications as read if relationships already exist

-- 1. Mark relationship notifications as read if the relationship already exists
UPDATE notifications 
SET is_read = true, read_at = NOW()
WHERE id IN (
  SELECT n.id 
  FROM notifications n
  WHERE n.type IN ('supervisor_invitation', 'student_invitation')
    AND n.is_read = false
    AND EXISTS (
      SELECT 1 
      FROM student_supervisor_relationships r
      WHERE r.status = 'active'
        AND (
          (r.student_id = n.user_id AND r.supervisor_id = n.actor_id)
          OR 
          (r.student_id = n.actor_id AND r.supervisor_id = n.user_id)
        )
    )
);

-- 2. Mark collection notifications as read if user is already a member
UPDATE notifications 
SET is_read = true, read_at = NOW()
WHERE id IN (
  SELECT n.id 
  FROM notifications n
  WHERE n.type = 'collection_invitation'
    AND n.is_read = false
    AND EXISTS (
      SELECT 1 
      FROM map_preset_members m
      WHERE m.user_id = n.user_id
        AND m.preset_id = (n.metadata->>'collection_id')::uuid
    )
);

-- 3. Update pending_invitations status to 'accepted' if relationship exists
UPDATE pending_invitations 
SET status = 'accepted', updated_at = NOW()
WHERE id IN (
  SELECT pi.id 
  FROM pending_invitations pi
  WHERE pi.status = 'pending'
    AND EXISTS (
      SELECT 1 
      FROM student_supervisor_relationships r
      WHERE r.status = 'active'
        AND (
          (r.student_id = pi.targetUserId AND r.supervisor_id = pi.invited_by)
          OR 
          (r.student_id = pi.invited_by AND r.supervisor_id = pi.targetUserId)
        )
    )
);

-- 4. Show results
SELECT 
  'CLEANUP_RESULTS' as check_type,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN is_read = true THEN 1 END) as read_notifications,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications
FROM notifications 
WHERE type IN ('supervisor_invitation', 'student_invitation', 'collection_invitation');

SELECT 
  'PENDING_INVITATIONS_RESULTS' as check_type,
  COUNT(*) as total_pending,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count
FROM pending_invitations;
