-- Update Push Notification Translation Timestamps
-- This will force the cache to refresh for these specific translations

-- Update the updated_at timestamp to NOW() for push notification translations
UPDATE "public"."translations" 
SET "updated_at" = NOW() 
WHERE "key" IN (
  'pushNotifications.title',
  'pushNotifications.physicalDevice',
  'pushNotifications.failedToken'
)
AND "platform" = 'mobile';

-- Verify the update (optional - you can run this to check)
-- SELECT key, language, value, updated_at 
-- FROM "public"."translations" 
-- WHERE "key" LIKE 'pushNotifications.%' 
-- ORDER BY key, language;

