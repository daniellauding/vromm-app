-- ============================================
-- SIMPLE INVITATION SYSTEM FIX
-- ============================================
-- First, let's see what we're working with

-- 1. Check current notifications table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if pending_invitations table exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Create notification_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'supervisor_invitation',
      'student_invitation', 
      'new_follower',
      'route_reviewed',
      'route_driven',
      'route_saved',
      'message_received',
      'event_invitation'
    );
    RAISE NOTICE 'Created notification_type enum';
  END IF;
END $$;

-- 4. Ensure notifications table has type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'type'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE notifications ADD COLUMN type notification_type;
    RAISE NOTICE 'Added type column to notifications';
  END IF;
END $$;

-- 5. Create pending_invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT,
  invited_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id),
  UNIQUE(email, invited_by)
);

-- 6. Create test invitation and notification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pending_invitations 
    WHERE email = 'daniel+student@lauding.se' 
    AND invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  ) THEN
    INSERT INTO pending_invitations (
      id,
      email,
      role,
      invited_by,
      status,
      metadata
    ) VALUES (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
      'daniel+student@lauding.se',
      'student',
      '06c73e75-0ef7-442b-acd0-ee204f83d1aa',
      'pending',
      '{
        "relationshipType": "supervisor_invites_student",
        "supervisorName": "daniel+handledare",
        "inviterRole": "instructor"
      }'::jsonb
    );
    RAISE NOTICE 'Created invitation';
  ELSE
    -- Update existing invitation
    UPDATE pending_invitations SET
      status = 'pending',
      metadata = '{
        "relationshipType": "supervisor_invites_student",
        "supervisorName": "daniel+handledare",
        "inviterRole": "instructor"
      }'::jsonb,
      updated_at = NOW()
    WHERE email = 'daniel+student@lauding.se' 
    AND invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa';
    RAISE NOTICE 'Updated existing invitation';
  END IF;
END $$;

-- 7. Create notification (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
    AND metadata->>'invitation_id' = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ) THEN
    INSERT INTO notifications (
      user_id,
      actor_id,
      type,
      message,
      metadata,
      is_read
    ) VALUES (
      'c16a364f-3bc4-4d60-bca9-460e977fddea',
      '06c73e75-0ef7-442b-acd0-ee204f83d1aa',
      'student_invitation'::notification_type,
      'daniel+handledare invited you to be their student',
      '{
        "invitation_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "inviter_name": "daniel+handledare"
      }'::jsonb,
      false
    );
    RAISE NOTICE 'Created notification';
  ELSE
    RAISE NOTICE 'Notification already exists';
  END IF;
END $$;

-- 8. Verify everything was created
SELECT 'INVITATION' as record_type, id::text as record_id, email as info, status as status_info 
FROM pending_invitations 
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid

UNION ALL

SELECT 'NOTIFICATION' as record_type, id::text as record_id, user_id::text as info, type::text as status_info 
FROM notifications 
WHERE metadata->>'invitation_id' = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
