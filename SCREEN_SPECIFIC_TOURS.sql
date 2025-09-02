-- SCREEN-SPECIFIC TOURS SQL
-- Copy-paste this SQL to add screen-specific tour steps

-- Step 1: Insert screen-specific tour steps
INSERT INTO "public"."content" (
  "id", "key", "content_type", "platforms", "title", "body", 
  "image_url", "icon", "icon_color", "order_index", "active", 
  "created_at", "updated_at", "images", "has_language_images", 
  "icon_svg", "embed_code", "youtube_embed", "iframe_embed", 
  "media_type", "media_enabled", "target", "category_id", "category"
) VALUES 

-- ROUTEDETAILSCREEN TOURS
-- 1. Save Route Button
('aaaa1111-bbbb-2222-cccc-333344445555', 'tour.screen.route_detail.save', 'tour', ARRAY['mobile'],
 '{"en": "Save This Route", "sv": "Spara Denna Rutt"}',
 '{"en": "Bookmark routes you like! Tap here to save this route to your personal collection for easy access later.", "sv": "Bokmärk rutter du gillar! Tryck här för att spara denna rutt till din personliga samling för enkel åtkomst senare."}',
 NULL, '🔖', '#00E6C3', 1, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'RouteDetailScreen.SaveButton', NULL, 'center'),

-- 2. Interactive Route Map
('bbbb2222-cccc-3333-dddd-444455556666', 'tour.screen.route_detail.map', 'tour', ARRAY['mobile'],
 '{"en": "Interactive Route Map", "sv": "Interaktiv Ruttkarta"}',
 '{"en": "This shows the exact route path with waypoints. You can explore the route visually before driving it.", "sv": "Detta visar den exakta ruttvägen med vägpunkter. Du kan utforska rutten visuellt innan du kör den."}',
 NULL, '🗺️', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'RouteDetailScreen.MapCard', NULL, 'center'),

-- 3. Practice Exercises
('cccc3333-dddd-4444-eeee-555566667777', 'tour.screen.route_detail.exercises', 'tour', ARRAY['mobile'],
 '{"en": "Practice Exercises", "sv": "Övningsexerciser"}',
 '{"en": "Complete these exercises to improve specific driving skills along this route. Track your progress and master each technique!", "sv": "Slutför dessa övningar för att förbättra specifika körfärdigheter längs denna rutt. Spåra dina framsteg och bemästra varje teknik!"}',
 NULL, '📚', '#00E6C3', 3, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'RouteDetailScreen.ExercisesCard', NULL, 'center'),

-- PROGRESSSCREEN TOURS
-- 4. Learning Progress Overview
('dddd4444-eeee-5555-ffff-666677778888', 'tour.screen.progress.overview', 'tour', ARRAY['mobile'],
 '{"en": "Your Learning Progress", "sv": "Dina Lärningsframsteg"}',
 '{"en": "Each card shows a learning path with your completion percentage. Tap any path to see detailed exercises and track your skills development.", "sv": "Varje kort visar en lärningsväg med din slutförandeprocent. Tryck på vilken väg som helst för att se detaljerade övningar och spåra din färdighetsutveckling."}',
 NULL, '📊', '#00E6C3', 1, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ProgressScreen.FirstPath', NULL, 'center'),

-- 5. Filter Learning Paths
('eeee5555-ffff-6666-aaaa-777788889999', 'tour.screen.progress.filter', 'tour', ARRAY['mobile'],
 '{"en": "Filter Learning Paths", "sv": "Filtrera Lärningsvägar"}',
 '{"en": "Customize what learning paths you see based on your vehicle type, license, experience level, and more. Filters save automatically!", "sv": "Anpassa vilka lärningsvägar du ser baserat på din fordonstyp, körkort, erfarenhetsnivå och mer. Filter sparas automatiskt!"}',
 NULL, '🎛️', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ProgressScreen.FilterButton', NULL, 'top'),

-- EXERCISE DETAIL TOURS
-- 6. Mark Exercise Complete
('ffff6666-aaaa-7777-bbbb-888899990000', 'tour.screen.exercise.complete', 'tour', ARRAY['mobile'],
 '{"en": "Mark Exercise Complete", "sv": "Markera Övning Som Slutförd"}',
 '{"en": "Tap here to mark this exercise as completed! This tracks your progress and unlocks new learning content.", "sv": "Tryck här för att markera denna övning som slutförd! Detta spårar dina framsteg och låser upp nytt lärningsinnehåll."}',
 NULL, '✅', '#00E6C3', 1, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ExerciseDetail.MarkCompleteButton', NULL, 'center'),

-- 7. Practice Repetitions
('aaaa7777-bbbb-8888-cccc-999900001111', 'tour.screen.exercise.repeats', 'tour', ARRAY['mobile'],
 '{"en": "Practice Repetitions", "sv": "Övningsrepetitioner"}',
 '{"en": "Some exercises require multiple repetitions to master. Track your progress through each repetition here.", "sv": "Vissa övningar kräver flera repetitioner för att bemästra. Spåra dina framsteg genom varje repetition här."}',
 NULL, '🔄', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ExerciseDetail.RepeatSection', NULL, 'center');

-- Verification query for screen-specific tours
SELECT 
  'SCREEN-SPECIFIC TOURS VERIFICATION' as section,
  id,
  key,
  title->>'en' as english_title,
  target,
  order_index,
  active
FROM "public"."content" 
WHERE content_type = 'tour' 
  AND key LIKE 'tour.screen.%'
ORDER BY key, order_index;
