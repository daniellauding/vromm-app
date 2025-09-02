-- MAIN HOME TOUR - ONLY HOME TARGETS
-- Copy-paste this SQL for the main home tour that shows on HomeScreen

-- Step 1: Clean up existing main mobile tour content
DELETE FROM "public"."content" 
WHERE content_type = 'tour' 
  AND platforms @> ARRAY['mobile']
  AND key LIKE 'tour.mobile.%'
  AND key NOT LIKE 'tour.screen.%'; -- Keep screen-specific tours separate

-- Step 2: Insert MAIN HOME tour steps (GettingStarted + ProgressSection only)
INSERT INTO "public"."content" (
  "id", "key", "content_type", "platforms", "title", "body", 
  "image_url", "icon", "icon_color", "order_index", "active", 
  "created_at", "updated_at", "images", "has_language_images", 
  "icon_svg", "embed_code", "youtube_embed", "iframe_embed", 
  "media_type", "media_enabled", "target", "category_id", "category"
) VALUES 
-- 1. License Plan Card (GettingStarted) - UNCHANGED
('11111111-1111-1111-1111-111111111111', 'tour.mobile.gettingstarted', 'tour', ARRAY['mobile'], 
 '{"en": "Your License Journey", "sv": "Din Körkortsresa"}', 
 '{"en": "Start here! Fill out your license plan to tell us about your driving goals, experience level, and vehicle preferences. This helps us customize your learning path.", "sv": "Börja här! Fyll i din körkortsplan för att berätta om dina körmål, erfarenhetsnivå och fordonsförinställningar. Detta hjälper oss att anpassa din inlärningsväg."}',
 NULL, '📋', '#4B6BFF', 1, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'GettingStarted.LicensePlan', NULL, 'center'),

-- 2. NEW: Home Routes Overview (ProgressSection First Card)
('66666666-6666-6666-6666-666666666666', 'tour.mobile.home.routes', 'tour', ARRAY['mobile'],
 '{"en": "Discover Routes & Progress", "sv": "Upptäck Rutter & Framsteg"}',
 '{"en": "Here you can find your routes - saved routes, created routes, nearby routes, community routes, and track your learning progress. Everything is organized for easy access!", "sv": "Här kan du hitta dina rutter - sparade rutter, skapade rutter, närliggande rutter, community-rutter och följa dina lärandeframsteg. Allt är organiserat för enkel åtkomst!"}',
 NULL, '🏠', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ProgressSection.FirstCard', NULL, 'center'),

-- MAIN HOME TOUR COMPLETE - Only 2 steps for HomeScreen elements

-- Verification
SELECT 
  'UPDATED MOBILE TOUR VERIFICATION' as section,
  id,
  key,
  title->>'en' as english_title,
  target,
  order_index,
  active
FROM "public"."content" 
WHERE content_type = 'tour' 
  AND platforms @> ARRAY['mobile']
ORDER BY order_index;
