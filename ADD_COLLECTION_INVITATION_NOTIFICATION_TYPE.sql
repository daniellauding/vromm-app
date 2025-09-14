-- Add collection_invitation to notification_type enum
-- This allows collection sharing invitations to create proper notifications

-- Add the new enum value
ALTER TYPE notification_type ADD VALUE 'collection_invitation';

-- Note: You may need to restart your application or reconnect to the database
-- for the new enum value to be available in your application code.
