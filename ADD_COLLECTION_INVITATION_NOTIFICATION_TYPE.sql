-- Add collection_invitation to notification_type enum
-- This allows collection sharing invitations to create proper notifications

-- Add the new enum value
ALTER TYPE notification_type ADD VALUE 'collection_invitation';

-- Verify the enum was updated
SELECT unnest(enum_range(NULL::notification_type)) as notification_types;
