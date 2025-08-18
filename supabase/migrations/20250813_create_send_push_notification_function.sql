-- Create send_push_notification function
-- Migration: 20250813_create_send_push_notification_function.sql

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
  -- Insert notification into notifications table
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    action_url,
    priority,
    is_read,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    COALESCE(p_data, '{}'::jsonb),
    p_action_url,
    p_priority,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;