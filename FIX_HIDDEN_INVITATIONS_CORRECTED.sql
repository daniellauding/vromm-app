-- Fix hidden invitations between supervisor and student (CORRECTED VERSION)
-- This will clean up orphaned invitations and ensure UI shows them correctly

-- Target users:
-- Supervisor (inviter): 06c73e75-0ef7-442b-acd0-ee204f83d1aa (daniel+handledare@lauding.se)
-- Student (invitee): c16a364f-3bc4-4d60-bca9-460e977fddea (daniel+student@lauding.se)

-- 1. Show current state
SELECT 'BEFORE CLEANUP:' as status;
SELECT 
  COUNT(*) as pending_count,
  pi.invited_by,
  pi.email,
  pi.status
FROM pending_invitations pi
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.email = 'daniel+student@lauding.se'
GROUP BY pi.invited_by, pi.email, pi.status;

-- 2. Check if relationship already exists (if so, mark invitations as accepted)
DO $$
DECLARE
  relationship_exists BOOLEAN;
  pending_count INTEGER;
  oldest_invitation_id UUID;
BEGIN
  -- Check if relationship already exists
  SELECT EXISTS(
    SELECT 1 FROM student_supervisor_relationships 
    WHERE (student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
       OR (student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea')
  ) INTO relationship_exists;
  
  -- Count pending invitations
  SELECT COUNT(*) INTO pending_count
  FROM pending_invitations
  WHERE invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
    AND email = 'daniel+student@lauding.se'
    AND status = 'pending';
  
  RAISE NOTICE 'Relationship exists: %, Pending invitations: %', relationship_exists, pending_count;
  
  IF relationship_exists THEN
    -- Mark all pending invitations as accepted since relationship exists
    UPDATE pending_invitations 
    SET 
      status = 'accepted',
      accepted_at = NOW(),
      accepted_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea',
      updated_at = NOW()
    WHERE invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
      AND email = 'daniel+student@lauding.se'
      AND status = 'pending';
    
    RAISE NOTICE 'Marked % invitations as accepted (relationship exists)', pending_count;
    
  ELSIF pending_count > 1 THEN
    -- Keep only the most recent pending invitation, mark others as cancelled
    SELECT id INTO oldest_invitation_id
    FROM pending_invitations
    WHERE invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
      AND email = 'daniel+student@lauding.se'
      AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Cancel all except the most recent
    UPDATE pending_invitations 
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
      AND email = 'daniel+student@lauding.se'
      AND status = 'pending'
      AND id != oldest_invitation_id;
    
    RAISE NOTICE 'Kept 1 invitation, cancelled % duplicates', pending_count - 1;
    
  ELSE
    RAISE NOTICE 'Only 1 pending invitation found - this is correct';
  END IF;
END $$;

-- 3. Clean up orphaned notifications (notifications without valid invitation_id)
DELETE FROM notifications 
WHERE type IN ('student_invitation', 'supervisor_invitation')
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

-- 4. Ensure there's a notification for any remaining pending invitation
INSERT INTO notifications (
  id,
  user_id,
  actor_id,
  type,
  title,
  message,
  metadata,
  action_url,
  priority,
  is_read,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'c16a364f-3bc4-4d60-bca9-460e977fddea', -- student receives notification
  pi.invited_by, -- supervisor is actor
  'student_invitation',
  'New Invitation',
  inviter.full_name || ' invited you to be their student',
  jsonb_build_object(
    'relationship_type', 'supervisor_invites_student',
    'from_user_id', pi.invited_by,
    'from_user_name', inviter.full_name,
    'invitation_id', pi.id::text
  ),
  'vromm://notifications',
  'high',
  false,
  NOW(),
  NOW()
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.email = 'daniel+student@lauding.se'
  AND pi.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
      AND n.actor_id = pi.invited_by
      AND n.type = 'student_invitation'
      AND (n.metadata->>'invitation_id')::uuid = pi.id
  );

-- 5. Show final state
SELECT 'AFTER CLEANUP:' as status;

SELECT 'PENDING INVITATIONS:' as section;
SELECT 
  pi.id,
  pi.email,
  pi.invited_by,
  pi.status,
  pi.created_at,
  pi.metadata->>'relationshipType' as relationship_type,
  inviter.full_name as inviter_name
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.email = 'daniel+student@lauding.se'
ORDER BY pi.created_at DESC;

SELECT 'NOTIFICATIONS:' as section;
SELECT 
  n.id,
  n.user_id,
  n.actor_id,
  n.type,
  n.is_read,
  n.created_at,
  n.metadata->>'invitation_id' as invitation_id
FROM notifications n
WHERE n.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
  AND n.actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND n.type = 'student_invitation'
ORDER BY n.created_at DESC;

SELECT 'RELATIONSHIPS:' as section;
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

SELECT '✅ CLEANUP COMPLETE!' as final_status;
