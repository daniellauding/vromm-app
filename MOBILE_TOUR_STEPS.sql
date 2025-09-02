-- MOBILE TOUR STEPS - PRODUCTION READY
-- Copy-paste this SQL to Supabase to create mobile tour steps pointing to real UI elements
-- Uses exact target selectors for mobile app components

-- Clean up any existing mobile tour content first (optional)
-- DELETE FROM "public"."content" WHERE content_type = 'tour' AND platforms @> ARRAY['mobile'];

-- MOBILE TOUR STEP 1: GettingStarted First Box (License Plan)
INSERT INTO "public"."content" (
  "id", "key", "content_type", "platforms", "title", "body", 
  "image_url", "icon", "icon_color", "order_index", "active", 
  "created_at", "updated_at", "images", "has_language_images", 
  "icon_svg", "embed_code", "youtube_embed", "iframe_embed", 
  "media_type", "media_enabled", "target", "category_id", "category"
) VALUES 
('11111111-1111-1111-1111-111111111111', 'tour.mobile.gettingstarted', 'tour', ARRAY['mobile'], 
 '{"en": "Your License Journey", "sv": "Din Körkortsresa"}', 
 '{"en": "Start here! Fill out your license plan to tell us about your driving goals, experience level, and vehicle preferences. This helps us customize your learning path.", "sv": "Börja här! Fyll i din körkortsplan för att berätta om dina körmål, erfarenhetsnivå och fordonsförinställningar. Detta hjälper oss att anpassa din inlärningsväg."}', 
 null, '📋', '#4B6BFF', 1, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'GettingStarted.LicensePlan', null, 'center'),

-- MOBILE TOUR STEP 2: Progress Tab Button  
('22222222-2222-2222-2222-222222222222', 'tour.mobile.progress.tab', 'tour', ARRAY['mobile'], 
 '{"en": "Track Your Progress", "sv": "Följ Din Utveckling"}', 
 '{"en": "Tap here to see your learning progress! Complete exercises, track your driving skills, and follow personalized learning paths based on your preferences from onboarding.", "sv": "Tryck här för att se dina framsteg! Slutför övningar, spåra dina körfärdigheter och följ personliga inlärningsvägar baserat på dina inställningar från introduktionen."}', 
 null, '📊', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'ProgressTab', null, 'bottom'),

-- MOBILE TOUR STEP 3: Central Create Button
('33333333-3333-3333-3333-333333333333', 'tour.mobile.create.button', 'tour', ARRAY['mobile'], 
 '{"en": "Create Routes & Events", "sv": "Skapa Rutter & Evenemang"}', 
 '{"en": "This is your creation hub! Tap the plus button to create new driving routes, record your practice sessions, or organize driving events. Everything starts here!", "sv": "Detta är ditt skapande-nav! Tryck på plus-knappen för att skapa nya körrutter, spela in dina övningssessioner eller organisera körevenemang. Allt börjar här!"}', 
 null, '➕', '#00E6C3', 3, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'CreateRouteTab', null, 'center'),

-- MOBILE TOUR STEP 4: Map Tab
('44444444-4444-4444-4444-444444444444', 'tour.mobile.map.explore', 'tour', ARRAY['mobile'], 
 '{"en": "Explore Routes on Map", "sv": "Utforska Rutter på Kartan"}', 
 '{"en": "Discover driving routes near you! The map shows practice routes created by the community, filtered by your location and preferences. Perfect for finding new places to practice!", "sv": "Upptäck körrutter nära dig! Kartan visar övningsrutter skapade av gemenskapen, filtrerade efter din plats och inställningar. Perfekt för att hitta nya platser att träna på!"}', 
 null, '🗺️', '#00E6C3', 4, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'MapTab', null, 'bottom'),

-- MOBILE TOUR STEP 5: Menu/Hamburger Drawer
('55555555-5555-5555-5555-555555555555', 'tour.mobile.menu.drawer', 'tour', ARRAY['mobile'], 
 '{"en": "Menu & Account Management", "sv": "Meny & Kontohantering"}', 
 '{"en": "Access your profile, settings, messages, and notifications here! Manage your relationships with instructors or students, view your driving statistics, and customize your experience.", "sv": "Kom åt din profil, inställningar, meddelanden och aviseringar här! Hantera dina relationer med instruktörer eller elever, visa din körstatistik och anpassa din upplevelse."}', 
 null, '☰', '#00E6C3', 5, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'MenuTab', null, 'bottom-right')

-- Note: Using fixed UUIDs to avoid duplicates on re-run

-- VERIFY MOBILE TOUR CONTENT
SELECT 
  id,
  key,
  title->>'en' as title_en,
  title->>'sv' as title_sv,
  body->>'en' as content_en,
  icon,
  target,
  category as position,
  order_index,
  active
FROM "public"."content" 
WHERE content_type = 'tour' 
  AND active = true 
  AND platforms @> ARRAY['mobile']
ORDER BY order_index;
