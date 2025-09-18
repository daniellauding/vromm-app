-- Fix notification type enum and column issues
-- This script addresses the errors:
-- ERROR: 22P02: invalid input value for enum notification_type: "collection_sharing"
-- ERROR: 42703: column "target_user_id" does not exist

-- First, let's check what notification types are actually valid
SELECT DISTINCT type FROM notifications;

-- Check the actual structure of the notifications table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- If we need to add missing notification types to the enum, we can do:
-- ALTER TYPE notification_type ADD VALUE 'collection_sharing';
-- ALTER TYPE notification_type ADD VALUE 'collection_member_added';
-- ALTER TYPE notification_type ADD VALUE 'collection_member_removed';

-- However, let's first check if these values already exist
SELECT unnest(enum_range(NULL::notification_type)) as notification_types;

-- If the enum doesn't have these values, we need to add them
-- Note: PostgreSQL doesn't allow adding enum values in a transaction that's already started
-- So this might need to be run separately

-- For now, let's use the correct column names and valid notification types
-- Replace any queries that use 'collection_sharing' with 'collection_invitation'
-- Replace any queries that use 'target_user_id' with 'user_id'

-- Example corrected query:
SELECT 
  n.id,
  n.user_id,  -- Use 'user_id' instead of 'target_user_id'
  n.actor_id,
  n.type,
  n.title,
  n.message,
  n.metadata,
  n.created_at,
  n.is_read
FROM notifications n
WHERE n.type IN ('collection_invitation', 'supervisor_invitation', 'student_invitation')
  AND n.is_read = false
ORDER BY n.created_at DESC;
