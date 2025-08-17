-- ============================================
-- INVITATION SYSTEM FIXES
-- ============================================
-- Copy and paste these SQL commands to fix the invitation system issues

-- 1. Fix notification_type enum to include all needed types
DROP TYPE IF EXISTS notification_type CASCADE;
CREATE TYPE notification_type AS ENUM (
  'supervisor_invitation',
  'student_invitation', 
  'new_follower',
  'new_route_from_followed_user',
  'route_completed',
  'route_reviewed',
  'route_liked',
  'exercise_completed',
  'achievement_unlocked',
  'learning_path_completed',
  'quiz_completed',
  'message_received',
  'conversation_created',
  'supervisor_accepted',
  'student_accepted',
  'route_shared',
  'profile_viewed',
  'route_driven',
  'route_saved',
  'follow_new_route',
  'follow_drove_route',
  'follow_saved_route',
  'new_message',
  'route_created',
  'event_invitation',
  'event_updated',
  'event_invite'
);

-- 2. Ensure notifications table has correct structure
-- First check if the column exists, if not add it
DO $$
BEGIN
  -- Check if type column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'type'
  ) THEN
    -- Add the type column if it doesn't exist
    ALTER TABLE notifications ADD COLUMN type notification_type;
    RAISE NOTICE 'Added type column to notifications table';
  ELSE
    -- Update existing column type
    ALTER TABLE notifications 
    ALTER COLUMN type TYPE notification_type USING type::text::notification_type;
    RAISE NOTICE 'Updated existing type column';
  END IF;
END $$;

-- 3. Create test invitation record for debugging
INSERT INTO pending_invitations (
  id,
  email,
  role,
  invited_by,
  status,
  metadata,
  created_at,
  updated_at
) VALUES (
  'test-invitation-123',
  'daniel+student@lauding.se',
  'student',
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa',
  'pending',
  '{
    "relationshipType": "supervisor_invites_student",
    "supervisorName": "daniel+handledare",
    "inviterRole": "instructor",
    "invitedAt": "2025-01-17T10:30:00.000Z"
  }'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (email, invited_by) DO UPDATE SET
  status = 'pending',
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- 4. Create corresponding notification for the student
INSERT INTO notifications (
  user_id,
  actor_id,
  type,
  message,
  metadata,
  is_read,
  created_at
) VALUES (
  'c16a364f-3bc4-4d60-bca9-460e977fddea',
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa',
  'student_invitation'::notification_type,
  'daniel+handledare invited you to be their student',
  '{
    "invitation_id": "test-invitation-123",
    "inviter_name": "daniel+handledare",
    "relationship_type": "supervisor_invites_student"
  }'::jsonb,
  false,
  NOW()
) ON CONFLICT DO NOTHING;

-- 5. Verify the data was inserted correctly
SELECT 
  'PENDING INVITATIONS' as table_name,
  id,
  email,
  status,
  invited_by,
  metadata
FROM pending_invitations 
WHERE email = 'daniel+student@lauding.se'

UNION ALL

SELECT 
  'NOTIFICATIONS' as table_name,
  id::text,
  user_id as email,
  type::text as status,
  actor_id as invited_by,
  metadata
FROM notifications 
WHERE user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
AND type IN ('student_invitation', 'supervisor_invitation')
ORDER BY table_name;

-- 6. Function to manually accept invitation (for testing)
CREATE OR REPLACE FUNCTION accept_test_invitation()
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  invitation_record RECORD;
  student_id UUID;
  supervisor_id UUID;
BEGIN
  -- Get the test invitation
  SELECT * INTO invitation_record
  FROM pending_invitations 
  WHERE id = 'test-invitation-123'
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No pending invitation found';
    RETURN false;
  END IF;
  
  -- Update invitation status
  UPDATE pending_invitations 
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
  WHERE id = 'test-invitation-123';
  
  -- Determine relationship direction
  IF invitation_record.metadata->>'relationshipType' = 'supervisor_invites_student' THEN
    student_id := 'c16a364f-3bc4-4d60-bca9-460e977fddea'; -- accepter
    supervisor_id := invitation_record.invited_by; -- inviter
  ELSE
    student_id := invitation_record.invited_by; -- inviter
    supervisor_id := 'c16a364f-3bc4-4d60-bca9-460e977fddea'; -- accepter
  END IF;
  
  -- Create relationship
  INSERT INTO student_supervisor_relationships (
    student_id,
    supervisor_id,
    status,
    created_at
  ) VALUES (
    student_id,
    supervisor_id,
    'active',
    NOW()
  ) ON CONFLICT (student_id, supervisor_id) DO UPDATE SET
    status = 'active',
    updated_at = NOW();
  
  RAISE NOTICE 'Invitation accepted successfully: student=%, supervisor=%', student_id, supervisor_id;
  RETURN true;
END;
$$;

-- 7. Test the acceptance function
SELECT accept_test_invitation();

-- 8. Verify the relationship was created
SELECT 
  'RELATIONSHIP CREATED' as status,
  student_id,
  supervisor_id,
  status as relationship_status,
  created_at
FROM student_supervisor_relationships
WHERE (student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' 
       OR supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea')
AND status = 'active';

-- 9. Clean up test function
DROP FUNCTION IF EXISTS accept_test_invitation();

COMMIT;
