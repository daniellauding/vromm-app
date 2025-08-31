-- Simple promotional modal creation using auto-generated UUIDs
-- This is the safest approach - let PostgreSQL generate valid UUIDs

-- Test Modal 1: Welcome Modal
INSERT INTO "public"."content" (
  "id", 
  "key", 
  "content_type", 
  "platforms", 
  "title", 
  "body", 
  "image_url", 
  "icon", 
  "icon_color", 
  "order_index", 
  "active", 
  "media_type", 
  "media_enabled"
) VALUES (
  gen_random_uuid(),
  'modal.welcome.test',
  'modal',
  ARRAY['mobile'],
  '{"en": "Welcome to Vromm! 🚗", "sv": "Välkommen till Vromm! 🚗"}',
  '{"en": "Discover the best driving practice routes near you!", "sv": "Upptäck de bästa övningskörningsrutterna nära dig!"}',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop',
  '🎉',
  '#00E6C3',
  1,
  true,
  'image',
  true
);

-- Test Modal 2: Feature Modal
INSERT INTO "public"."content" (
  "id", 
  "key", 
  "content_type", 
  "platforms", 
  "title", 
  "body", 
  "icon", 
  "icon_color", 
  "order_index", 
  "active", 
  "media_type", 
  "media_enabled",
  "target"
) VALUES (
  gen_random_uuid(),
  'modal.feature.test',
  'modal',
  ARRAY['mobile'],
  '{"en": "New Features Available! 🎥", "sv": "Nya funktioner tillgängliga! 🎥"}',
  '{"en": "Check out our latest features and improvements!", "sv": "Kolla in våra senaste funktioner och förbättringar!"}',
  '🎥',
  '#FF6B6B',
  2,
  true,
  'none',
  true,
  'ProgressTab'
);

-- Query to check what was created
SELECT 
  id,
  key,
  title->>'en' as title_en,
  title->>'sv' as title_sv,
  body->>'en' as content_en,
  icon,
  target,
  active
FROM "public"."content" 
WHERE content_type = 'modal' 
  AND key LIKE 'modal.%.test'
ORDER BY order_index;

-- To test:
-- 1. Run this SQL
-- 2. In the app, use debug menu to reset AsyncStorage
-- 3. Restart app and login
-- 4. Should see promotional modal

-- To clean up test data:
-- DELETE FROM "public"."content" WHERE key LIKE 'modal.%.test';
