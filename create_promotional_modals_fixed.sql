-- Create promotional modal content for mobile app
-- This uses the existing content table structure with content_type = 'modal'
-- Using proper UUIDs (generated with gen_random_uuid() or manually created)

-- Test Modal 1: Welcome Promotion with Image
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
  "created_at", 
  "updated_at", 
  "images", 
  "has_language_images", 
  "icon_svg", 
  "embed_code", 
  "youtube_embed", 
  "iframe_embed", 
  "media_type", 
  "media_enabled", 
  "target", 
  "category_id", 
  "category"
) VALUES (
  '12345678-1234-5678-9abc-def012345678',
  'modal.welcome.new',
  'modal',
  ARRAY['mobile'],
  '{"en": "Welcome to Vromm! 🚗", "sv": "Välkommen till Vromm! 🚗"}',
  '{"en": "Discover the best driving practice routes near you. Our app helps you find perfect spots for parking practice, highway driving, and city navigation.", "sv": "Upptäck de bästa övningskörningsrutterna nära dig. Vår app hjälper dig hitta perfekta platser för parkeringsträning, motorvägskörning och stadsnavigering."}',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop',
  '🎉',
  '#00E6C3',
  1,
  true,
  NOW(),
  NOW(),
  '{}',
  false,
  null,
  null,
  null,
  null,
  'image',
  true,
  'ProgressTab',
  null,
  'welcome'
);

-- Test Modal 2: Feature Highlight with YouTube Video
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
  "created_at", 
  "updated_at", 
  "images", 
  "has_language_images", 
  "icon_svg", 
  "embed_code", 
  "youtube_embed", 
  "iframe_embed", 
  "media_type", 
  "media_enabled", 
  "target", 
  "category_id", 
  "category"
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'modal.feature.recording',
  'modal',
  ARRAY['mobile'],
  '{"en": "New Feature: Route Recording! 📹", "sv": "Ny funktion: Ruttinspelning! 📹"}',
  '{"en": "Record your driving sessions and automatically create routes. Perfect for sharing your favorite practice spots with other learners!", "sv": "Spela in dina körsessioner och skapa automatiskt rutter. Perfekt för att dela dina favoritövningsplatser med andra elever!"}',
  null,
  '🎥',
  '#FF6B6B',
  2,
  true,
  NOW(),
  NOW(),
  '{}',
  false,
  null,
  null,
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  null,
  'video',
  true,
  'CreateRoute',
  null,
  'feature'
);

-- Test Modal 3: External Link Promotion
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
  "created_at", 
  "updated_at", 
  "images", 
  "has_language_images", 
  "icon_svg", 
  "embed_code", 
  "youtube_embed", 
  "iframe_embed", 
  "media_type", 
  "media_enabled", 
  "target", 
  "category_id", 
  "category"
) VALUES (
  'f9e8d7c6-b5a4-9382-1756-849302847561',
  'modal.promotion.website',
  'modal',
  ARRAY['mobile'],
  '{"en": "Visit Our Website! 🌐", "sv": "Besök vår hemsida! 🌐"}',
  '{"en": "Check out our website for the latest updates, driving tips, and community features. Join thousands of drivers improving their skills!", "sv": "Kolla in vår hemsida för de senaste uppdateringarna, körtips och community-funktioner. Gå med tusentals förare som förbättrar sina färdigheter!"}',
  'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',
  '🌟',
  '#8B5CF6',
  3,
  true,
  NOW(),
  NOW(),
  '{}',
  false,
  null,
  null,
  null,
  null,
  'image',
  true,
  'https://vromm.se',
  null,
  'promotion'
);

-- Alternative: Use gen_random_uuid() for automatic UUID generation
-- Uncomment the following if you prefer auto-generated UUIDs:

/*
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
  "media_enabled"
) VALUES (
  gen_random_uuid(),
  'modal.auto.generated',
  'modal',
  ARRAY['mobile'],
  '{"en": "Auto Generated Modal", "sv": "Automatiskt Genererad Modal"}',
  '{"en": "This modal was created with an auto-generated UUID", "sv": "Denna modal skapades med ett automatiskt genererat UUID"}',
  '🤖',
  '#00E6C3',
  4,
  true,
  'none',
  true
);
*/

-- Query to verify the promotional content
SELECT 
  id,
  key,
  title->>'en' as title_en,
  title->>'sv' as title_sv,
  body->>'en' as content_en,
  target,
  icon,
  order_index,
  youtube_embed,
  image_url,
  active
FROM "public"."content" 
WHERE content_type = 'modal' 
  AND active = true 
  AND platforms && ARRAY['mobile']
ORDER BY order_index;

-- To test the promotional modal functionality:
-- 1. Run this SQL to create test content
-- 2. Clear the AsyncStorage key: await AsyncStorage.removeItem('promotional_modal_seen');
-- 3. Restart the app
-- 4. Login - you should see the promotional modal

-- To disable promotional modals temporarily:
-- UPDATE "public"."content" SET active = false WHERE content_type = 'modal';

-- To re-enable them:
-- UPDATE "public"."content" SET active = true WHERE content_type = 'modal';
