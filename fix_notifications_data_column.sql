-- Fix notifications table - add missing 'data' column and enhance for push notifications
-- Run this SQL in Supabase SQL Editor

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
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread 
ON notifications(user_id) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_notifications_push_pending 
ON notifications(push_sent) WHERE push_sent = FALSE;

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

  -- TODO: Trigger actual push notification here
  -- This would integrate with your push notification service
  
  RETURN notification_id;
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

-- Add comment for documentation
COMMENT ON COLUMN notifications.data IS 'JSONB data containing notification-specific information like user IDs, route IDs, etc.';
COMMENT ON COLUMN notifications.action_url IS 'Deep link URL to open specific screen/content when notification is tapped';
COMMENT ON COLUMN notifications.priority IS 'Priority level for push notification delivery';
COMMENT ON COLUMN notifications.push_sent IS 'Whether push notification was successfully sent';
COMMENT ON COLUMN notifications.push_sent_at IS 'Timestamp when push notification was sent';

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_push_notification TO authenticated; 