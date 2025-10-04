-- Fix missing push notification translations
-- Run this in your Supabase SQL Editor

-- Insert push notification translations (will skip if they already exist)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES
  -- Push Notifications Title
  (gen_random_uuid(), 'pushNotifications.title', 'en', 'Push Notifications', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.title', 'sv', 'Push-notifieringar', 'mobile', NOW(), NOW()),
  
  -- Failed Token Message
  (gen_random_uuid(), 'pushNotifications.failedToken', 'en', 'Failed to get push token for push notification!', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.failedToken', 'sv', 'Misslyckades att få push-token för push-notifiering!', 'mobile', NOW(), NOW()),
  
  -- Physical Device Message
  (gen_random_uuid(), 'pushNotifications.physicalDevice', 'en', 'Must use physical device for Push Notifications', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.physicalDevice', 'sv', 'Måste använda fysisk enhet för Push-notifieringar', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the translations were inserted
SELECT key, language, value 
FROM translations 
WHERE key LIKE 'pushNotifications.%'
ORDER BY key, language;

