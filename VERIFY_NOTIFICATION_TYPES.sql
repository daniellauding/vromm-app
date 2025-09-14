-- Verify that collection_invitation was added to notification_type enum
-- Run this after executing ADD_COLLECTION_INVITATION_NOTIFICATION_TYPE.sql

SELECT unnest(enum_range(NULL::notification_type)) as notification_types
ORDER BY notification_types;
