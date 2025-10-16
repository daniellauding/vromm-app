-- Insert or update loader/spinner translations for Featured Content and Learning Paths
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") 
VALUES 
  (gen_random_uuid(), 'common.loading', 'en', 'Loading...', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'common.loading', 'sv', 'Laddar...', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'common.loadingContent', 'en', 'Loading content...', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'common.loadingContent', 'sv', 'Laddar innehåll...', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'home.loadingFeatured', 'en', 'Loading featured content...', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'home.loadingFeatured', 'sv', 'Laddar utvalt innehåll...', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'progressScreen.loadingPaths', 'en', 'Loading learning paths...', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'progressScreen.loadingPaths', 'sv', 'Laddar lärostigar...', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.title', 'en', 'Push Notifications', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.title', 'sv', 'Push-notiser', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.physicalDevice', 'en', 'Push notifications only work on physical devices', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.physicalDevice', 'sv', 'Push-notiser fungerar endast på fysiska enheter', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.failedToken', 'en', 'Failed to get push notification token', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'pushNotifications.failedToken', 'sv', 'Misslyckades med att hämta push-notifieringstoken', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

