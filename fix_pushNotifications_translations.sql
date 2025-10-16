-- Fix Push Notification Translations
-- Delete old entries and insert fresh ones with NOW() timestamps

-- Step 1: Delete existing push notification translations
DELETE FROM "public"."translations" 
WHERE "key" IN (
  'pushNotifications.title',
  'pushNotifications.physicalDevice',
  'pushNotifications.failedToken'
);

-- Step 2: Insert fresh translations with current timestamps
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") 
VALUES 
  (gen_random_uuid(), 'pushNotifications.title', 'en', 'Push Notifications', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.title', 'sv', 'Push-notiser', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.physicalDevice', 'en', 'Push notifications only work on physical devices', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.physicalDevice', 'sv', 'Push-notiser fungerar endast på fysiska enheter', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.failedToken', 'en', 'Failed to get push notification token', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.failedToken', 'sv', 'Misslyckades med att hämta push-notifieringstoken', 'mobile', NOW(), NOW());

-- Step 3: Verify the new translations (optional - uncomment to check)
-- SELECT key, language, value, updated_at 
-- FROM "public"."translations" 
-- WHERE "key" LIKE 'pushNotifications.%' 
-- ORDER BY key, language;

