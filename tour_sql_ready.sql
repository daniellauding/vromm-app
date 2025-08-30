-- Ready-to-execute SQL for tour content
-- Copy and paste this directly into Supabase SQL Editor

-- Insert mobile tour content (using proper PostgreSQL syntax)
INSERT INTO "public"."content" (
  "id", "key", "content_type", "platforms", "title", "body", 
  "image_url", "icon", "icon_color", "order_index", "active", 
  "created_at", "updated_at", "images", "has_language_images", 
  "icon_svg", "embed_code", "youtube_embed", "iframe_embed", 
  "media_type", "media_enabled", "target", "category_id", "category"
) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tour.mobile.progress', 'tour', ARRAY['mobile'], 
 '{"en": "Track Your Progress", "sv": "Följ Din Utveckling"}', 
 '{"en": "Here you can see your learning progress and complete exercises", "sv": "Här kan du se dina framsteg och slutföra övningar"}', 
 null, '📊', '#00E6C3', 1, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'ProgressTab', null, 'top-right'),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tour.mobile.create', 'tour', ARRAY['mobile'], 
 '{"en": "Create Routes & Events", "sv": "Skapa Rutter & Evenemang"}', 
 '{"en": "Add routes and events here using the central create button. Tap the plus button to get started!", "sv": "Lägg till rutter och evenemang här med den centrala skapa-knappen. Tryck på plus-knappen för att komma igång!"}', 
 null, '➕', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'HomeTab', null, 'bottom'),

('cccccccc-cccc-cccc-cccc-cccccccccccc', 'tour.mobile.filter', 'tour', ARRAY['mobile'], 
 '{"en": "Filter Learning Paths", "sv": "Filtrera Lärandevägar"}', 
 '{"en": "Use this filter button to customize learning paths based on your vehicle type, transmission, and license preferences from onboarding.", "sv": "Använd denna filterknapp för att anpassa lärandevägar baserat på dina fordon, växellåda och körkortsinställningar från introduktionen."}', 
 null, '🔍', '#00E6C3', 3, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'ProgressTab', null, 'top-left'),

('dddddddd-dddd-dddd-dddd-dddddddddddd', 'tour.mobile.menu', 'tour', ARRAY['mobile'], 
 '{"en": "Menu & Settings", "sv": "Meny & Inställningar"}', 
 '{"en": "Access your profile, settings, messages, and more through the menu tab. This is where you can manage your account and relationships.", "sv": "Kom åt din profil, inställningar, meddelanden och mer genom menyfliken. Här kan du hantera ditt konto och relationer."}', 
 null, '☰', '#00E6C3', 4, true, NOW(), NOW(), '{}', false, null, null, null, null, 'none', true, 'MenuTab', null, 'bottom-right');

-- Verify the tour content was inserted
SELECT 
  id,
  key,
  title->>'en' as title_en,
  body->>'en' as content_en,
  icon,
  target,
  category as position,
  order_index
FROM "public"."content" 
WHERE content_type = 'tour' 
  AND active = true 
  AND 'mobile' = ANY(platforms)
ORDER BY order_index;
