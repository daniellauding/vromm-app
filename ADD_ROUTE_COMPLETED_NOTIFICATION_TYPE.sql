-- Add 'route_completed' to notification_type enum
-- This provides a more specific notification type for when routes are completed

-- Add the new enum value
ALTER TYPE notification_type ADD VALUE 'route_completed';

-- Optional: Update existing notifications that use 'route_driven' for completion
-- to use the more specific 'route_completed' type
-- UPDATE notifications 
-- SET type = 'route_completed' 
-- WHERE type = 'route_driven' 
-- AND message LIKE '%completed your route%';
