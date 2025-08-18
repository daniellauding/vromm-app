-- Fix duplicate notifications for daniel+student@lauding.se
-- This will clean up the multiple student_invitation notifications

-- 1. Show current duplicate notifications
SELECT 'BEFORE CLEANUP - Duplicate Notifications:' as status;
SELECT 
  id,
  user_id,
  actor_id,
  type,
  created_at,
  metadata->>'invitation_id' as invitation_id
FROM notifications 
WHERE type = 'student_invitation' 
  AND user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
  AND actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
ORDER BY created_at DESC;

-- 2. Check if there are existing relationships that would make these notifications invalid
SELECT 'EXISTING RELATIONSHIPS:' as status;
SELECT 
  ssr.id,
  ssr.student_id,
  ssr.supervisor_id,
  ssr.status,
  ssr.created_at,
  student.email as student_email,
  supervisor.email as supervisor_email
FROM student_supervisor_relationships ssr
LEFT JOIN profiles student ON ssr.student_id = student.id
LEFT JOIN profiles supervisor ON ssr.supervisor_id = supervisor.id
WHERE (ssr.student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND ssr.supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
   OR (ssr.student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND ssr.supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea');

-- 3. Check pending invitations status
SELECT 'PENDING INVITATIONS:' as status;
SELECT 
  pi.id,
  pi.email,
  pi.invited_by,
  pi.status,
  pi.created_at,
  pi.metadata->>'relationshipType' as relationship_type
FROM pending_invitations pi
WHERE pi.email = 'daniel+student@lauding.se'
  AND pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
ORDER BY pi.created_at DESC;

-- 4. Clean up duplicate notifications - keep only the most recent one IF no relationship exists
-- First, check if relationship exists
DO $$
DECLARE
  relationship_exists BOOLEAN;
  notification_count INTEGER;
BEGIN
  -- Check if relationship already exists
  SELECT EXISTS(
    SELECT 1 FROM student_supervisor_relationships 
    WHERE (student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
       OR (student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea')
  ) INTO relationship_exists;
  
  -- Count notifications
  SELECT COUNT(*) INTO notification_count
  FROM notifications 
  WHERE type = 'student_invitation' 
    AND user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
    AND actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa';
  
  RAISE NOTICE 'Relationship exists: %, Notification count: %', relationship_exists, notification_count;
  
  IF relationship_exists THEN
    -- Delete ALL notifications since relationship already exists
    DELETE FROM notifications 
    WHERE type = 'student_invitation' 
      AND user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
      AND actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa';
    
    RAISE NOTICE 'Deleted all % notifications - relationship already exists', notification_count;
  ELSE
    -- Keep only the most recent notification, delete the rest
    DELETE FROM notifications 
    WHERE type = 'student_invitation' 
      AND user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
      AND actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
      AND id NOT IN (
        SELECT id FROM notifications 
        WHERE type = 'student_invitation' 
          AND user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
          AND actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
        ORDER BY created_at DESC 
        LIMIT 1
      );
    
    RAISE NOTICE 'Kept 1 notification, deleted % duplicates', notification_count - 1;
  END IF;
END $$;

-- 5. Show results after cleanup
SELECT 'AFTER CLEANUP - Remaining Notifications:' as status;
SELECT 
  id,
  user_id,
  actor_id,
  type,
  created_at,
  metadata->>'invitation_id' as invitation_id
FROM notifications 
WHERE type = 'student_invitation' 
  AND user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
  AND actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
ORDER BY created_at DESC;

-- 6. Also clean up any orphaned notifications (where invitation_id doesn't exist)
DELETE FROM notifications 
WHERE type IN ('student_invitation', 'supervisor_invitation')
  AND metadata->>'invitation_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pending_invitations 
    WHERE id::text = metadata->>'invitation_id'
  );

SELECT 'Cleanup completed!' as status;
