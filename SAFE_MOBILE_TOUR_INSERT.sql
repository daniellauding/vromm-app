-- SAFE MOBILE TOUR INSERT - NO CONFLICTS
-- Copy-paste this SQL to Supabase - handles duplicates safely

-- Step 1: Clean up existing mobile tour content to avoid duplicates
DELETE FROM "public"."content" 
WHERE content_type = 'tour' 
  AND platforms @> ARRAY['mobile']
  AND key LIKE 'tour.mobile.%';

-- Step 2: Insert mobile tour steps (safe because we just deleted any existing ones)
INSERT INTO "public"."content" (
  "id", "key", "content_type", "platforms", "title", "body", 
  "image_url", "icon", "icon_color", "order_index", "active", 
  "created_at", "updated_at", "images", "has_language_images", 
  "icon_svg", "embed_code", "youtube_embed", "iframe_embed", 
  "media_type", "media_enabled", "target", "category_id", "category"
) VALUES 
-- 1. License Plan Card (GettingStarted)
('11111111-1111-1111-1111-111111111111', 'tour.mobile.gettingstarted', 'tour', ARRAY['mobile'], 
 '{"en": "Your License Journey", "sv": "Din Körkortsresa"}', 
 '{"en": "Start here! Fill out your license plan to tell us about your driving goals, experience level, and vehicle preferences. This helps us customize your learning path.", "sv": "Börja här! Fyll i din körkortsplan för att berätta om dina körmål, erfarenhetsnivå och fordonsförinställningar. Detta hjälper oss att anpassa din inlärningsväg."}', 
 null, '📋', '#4B6BFF', 1, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'GettingStarted.LicensePlan', null, 'center'),

-- 2. Progress Tab Button  
('22222222-2222-2222-2222-222222222222', 'tour.mobile.progress.tab', 'tour', ARRAY['mobile'], 
 '{"en": "Track Your Progress", "sv": "Följ Din Utveckling"}', 
 '{"en": "Tap here to see your learning progress! Complete exercises, track your driving skills, and follow personalized learning paths based on your preferences from onboarding.", "sv": "Tryck här för att se dina framsteg! Slutför övningar, spåra dina körfärdigheter och följ personliga inlärningsvägar baserat på dina inställningar från introduktionen."}', 
 null, '📊', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'ProgressTab', null, 'bottom'),

-- 3. Central Create Button
('33333333-3333-3333-3333-333333333333', 'tour.mobile.create.button', 'tour', ARRAY['mobile'], 
 '{"en": "Create Routes & Events", "sv": "Skapa Rutter & Evenemang"}', 
 '{"en": "This is your creation hub! Tap the plus button to create new driving routes, record your practice sessions, or organize driving events. Everything starts here!", "sv": "Detta är ditt skapande-nav! Tryck på plus-knappen för att skapa nya körrutter, spela in dina övningssessioner eller organisera körevenemang. Allt börjar här!"}', 
 null, '➕', '#00E6C3', 3, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'CreateRouteTab', null, 'center'),

-- 4. Map Tab
('44444444-4444-4444-4444-444444444444', 'tour.mobile.map.explore', 'tour', ARRAY['mobile'], 
 '{"en": "Explore Routes on Map", "sv": "Utforska Rutter på Kartan"}', 
 '{"en": "Discover driving routes near you! The map shows practice routes created by the community, filtered by your location and preferences. Perfect for finding new places to practice!", "sv": "Upptäck körrutter nära dig! Kartan visar övningsrutter skapade av gemenskapen, filtrerade efter din plats och inställningar. Perfekt för att hitta nya platser att träna på!"}', 
 null, '🗺️', '#00E6C3', 4, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'MapTab', null, 'bottom'),

-- 5. Menu/Hamburger Drawer
('55555555-5555-5555-5555-555555555555', 'tour.mobile.menu.drawer', 'tour', ARRAY['mobile'], 
 '{"en": "Menu & Account Management", "sv": "Meny & Kontohantering"}', 
 '{"en": "Access your profile, settings, messages, and notifications here! Manage your relationships with instructors or students, view your driving statistics, and customize your experience.", "sv": "Kom åt din profil, inställningar, meddelanden och aviseringar här! Hantera dina relationer med instruktörer eller elever, visa din körstatistik och anpassa din upplevelse."}', 
 null, '☰', '#00E6C3', 5, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'MenuTab', null, 'bottom-right');

-- Step 3: Verify the tour content was inserted successfully
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
  active,
  platforms
FROM "public"."content" 
WHERE content_type = 'tour' 
  AND active = true 
  AND platforms @> ARRAY['mobile']
ORDER BY order_index;

-- Step 4: Check if TourContext can see the tour content
SELECT 
  key,
  target,
  category,
  '✅ Ready for TourContext.tsx' as status
FROM "public"."content" 
WHERE content_type = 'tour' 
  AND active = true 
  AND platforms @> ARRAY['mobile']
  AND key LIKE 'tour.mobile.%'
ORDER BY order_index;
