-- TAB NAVIGATION TOURS - SEPARATE FROM MAIN HOME TOUR
-- These trigger when users interact with specific tabs
-- Copy-paste this SQL to add tab navigation guidance

INSERT INTO "public"."content" (
  "id", "key", "content_type", "platforms", "title", "body", 
  "image_url", "icon", "icon_color", "order_index", "active", 
  "created_at", "updated_at", "images", "has_language_images", 
  "icon_svg", "embed_code", "youtube_embed", "iframe_embed", 
  "media_type", "media_enabled", "target", "category_id", "category"
) VALUES 

-- TAB NAVIGATION TOUR STEPS (triggered separately from main tour)
-- 1. Progress Tab 
('tab-1111-1111-1111-1111-111111111111', 'tour.tab.progress', 'tour', ARRAY['mobile'], 
 '{"en": "Track Your Progress", "sv": "Följ Din Utveckling"}', 
 '{"en": "Tap here to see your learning progress! Complete exercises, track your driving skills, and follow personalized learning paths based on your preferences from onboarding.", "sv": "Tryck här för att se dina framsteg! Slutför övningar, spåra dina körfärdigheter och följ personliga inlärningsvägar baserat på dina inställningar från introduktionen."}',
 NULL, '📊', '#00E6C3', 1, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ProgressTab', NULL, 'bottom'),

-- 2. Create Routes & Events
('tab-2222-2222-2222-2222-222222222222', 'tour.tab.create', 'tour', ARRAY['mobile'], 
 '{"en": "Create Routes & Events", "sv": "Skapa Rutter & Evenemang"}', 
 '{"en": "This is your creation hub! Tap the plus button to create new driving routes, record your practice sessions, or organize driving events. Everything starts here!", "sv": "Detta är ditt skapande-nav! Tryck på plus-knappen för att skapa nya körrutter, spela in dina övningssessioner eller organisera körevenemang. Allt börjar här!"}',
 NULL, '➕', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'CreateRouteTab', NULL, 'center'),

-- 3. Explore Routes on Map
('tab-3333-3333-3333-3333-333333333333', 'tour.tab.map', 'tour', ARRAY['mobile'], 
 '{"en": "Explore Routes on Map", "sv": "Utforska Rutter på Kartan"}', 
 '{"en": "Discover driving routes near you! The map shows practice routes created by the community, filtered by your location and preferences. Perfect for finding new places to practice!", "sv": "Upptäck körrutter nära dig! Kartan visar övningsrutter skapade av gemenskapen, filtrerade efter din plats och inställningar. Perfekt för att hitta nya platser att träna på!"}',
 NULL, '🗺️', '#00E6C3', 3, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'MapTab', NULL, 'bottom'),

-- 4. Menu & Account Management
('tab-4444-4444-4444-4444-444444444444', 'tour.tab.menu', 'tour', ARRAY['mobile'], 
 '{"en": "Menu & Account Management", "sv": "Meny & Kontohantering"}', 
 '{"en": "Access your profile, settings, messages, and notifications here! Manage your relationships with instructors or students, view your driving statistics, and customize your experience.", "sv": "Kom åt din profil, inställningar, meddelanden och aviseringar här! Hantera dina relationer med instruktörer eller elever, visa din körstatistik och anpassa din upplevelse."}',
 NULL, '☰', '#00E6C3', 4, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'MenuTab', NULL, 'bottom-right');

-- Verification
SELECT 
  'TAB NAVIGATION TOURS VERIFICATION' as section,
  id,
  key,
  title->>'en' as english_title,
  target,
  order_index,
  active
FROM "public"."content" 
WHERE content_type = 'tour' 
  AND key LIKE 'tour.tab.%'
ORDER BY order_index;
