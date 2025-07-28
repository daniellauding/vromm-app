-- Fix notifications table - CORRECTED VERSION
-- Run this SQL in Supabase SQL Editor

-- First, let's see what columns exist in notifications table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add 'data' column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'data'
  ) THEN
    ALTER TABLE notifications ADD COLUMN data JSONB;
    RAISE NOTICE 'Added data column to notifications table';
  END IF;
END $$;

-- Add additional columns for push notifications if they don't exist
DO $$ 
BEGIN
  -- Add push notification fields
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'push_sent'
  ) THEN
    ALTER TABLE notifications ADD COLUMN push_sent BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added push_sent column to notifications table';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'push_sent_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN push_sent_at TIMESTAMPTZ;
    RAISE NOTICE 'Added push_sent_at column to notifications table';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'action_url'
  ) THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
    RAISE NOTICE 'Added action_url column to notifications table';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high'));
    RAISE NOTICE 'Added priority column to notifications table';
  END IF;

  -- Add read_at column if it doesn't exist (for tracking when notification was read)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
    RAISE NOTICE 'Added read_at column to notifications table';
  END IF;
END $$;

-- Create indexes with proper column names - check if read column exists first
DO $$
DECLARE
  read_column_exists BOOLEAN;
  read_at_column_exists BOOLEAN;
BEGIN
  -- Check if 'read' column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'read'
  ) INTO read_column_exists;

  -- Check if 'read_at' column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'read_at'
  ) INTO read_at_column_exists;

  -- Create index based on what column exists
  IF read_at_column_exists THEN
    -- Use read_at column
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread ON notifications(user_id) WHERE read_at IS NULL';
    RAISE NOTICE 'Created index using read_at column';
  ELSIF read_column_exists THEN
    -- Use read column (boolean)
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread ON notifications(user_id) WHERE read = FALSE';
    RAISE NOTICE 'Created index using read column';
  ELSE
    RAISE NOTICE 'No read tracking column found - skipping unread index';
  END IF;
END $$;

-- Create other indexes
CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_notifications_push_pending 
ON notifications(push_sent) WHERE push_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON notifications(created_at DESC);

-- Create function to send push notifications
CREATE OR REPLACE FUNCTION send_push_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Insert notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    action_url,
    priority,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_data,
    p_action_url,
    p_priority,
    NOW()
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  read_column_exists BOOLEAN;
  read_at_column_exists BOOLEAN;
BEGIN
  -- Check what read tracking columns exist
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'read'
  ) INTO read_column_exists;

  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'read_at'
  ) INTO read_at_column_exists;

  -- Update based on available columns
  IF read_at_column_exists THEN
    UPDATE notifications SET read_at = NOW() WHERE id = notification_id;
  ELSIF read_column_exists THEN
    UPDATE notifications SET read = TRUE WHERE id = notification_id;
  ELSE
    RAISE EXCEPTION 'No read tracking column found in notifications table';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification types enum for consistency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
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
      'profile_viewed'
    );
    RAISE NOTICE 'Created notification_type enum';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN notifications.data IS 'JSONB data containing notification-specific information like user IDs, route IDs, etc.';
COMMENT ON COLUMN notifications.action_url IS 'Deep link URL to open specific screen/content when notification is tapped';
COMMENT ON COLUMN notifications.priority IS 'Priority level for push notification delivery';
COMMENT ON COLUMN notifications.push_sent IS 'Whether push notification was successfully sent';
COMMENT ON COLUMN notifications.push_sent_at IS 'Timestamp when push notification was sent';

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_push_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;

-- Final check - show the updated table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position; 