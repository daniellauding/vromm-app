-- IMPROVED SCREEN-SPECIFIC TOURS SQL
-- Copy-paste this SQL to add improved screen-specific tour steps with better targeting

-- Step 1: Clean up existing screen tours
DELETE FROM "public"."content" 
WHERE content_type = 'tour' 
  AND key LIKE 'tour.screen.%';

-- Step 2: Insert improved screen-specific tour steps
INSERT INTO "public"."content" (
  "id", "key", "content_type", "platforms", "title", "body", 
  "image_url", "icon", "icon_color", "order_index", "active", 
  "created_at", "updated_at", "images", "has_language_images", 
  "icon_svg", "embed_code", "youtube_embed", "iframe_embed", 
  "media_type", "media_enabled", "target", "category_id", "category"
) VALUES 

-- PROGRESSSCREEN TOURS (4 steps)
-- 1. Filter Learning Paths (targets filter button line #4395)
('a1111111-1111-1111-1111-111111111111', 'tour.screen.progress.filter', 'tour', ARRAY['mobile'],
 '{"en": "Filter Learning Paths", "sv": "Filtrera Lärningsvägar"}',
 '{"en": "Customize what learning paths you see based on your vehicle type, license, experience level, and more. Filters save automatically!", "sv": "Anpassa vilka lärningsvägar du ser baserat på din fordonstyp, körkort, erfarenhetsnivå och mer. Filter sparas automatiskt!"}',
 NULL, '🎛️', '#00E6C3', 1, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ProgressScreen.FilterButton', NULL, 'top'),

-- 2. Learning Path Overview (targets first path card line #4631)
('b2222222-2222-2222-2222-222222222222', 'tour.screen.progress.overview', 'tour', ARRAY['mobile'],
 '{"en": "Your Learning Progress", "sv": "Dina Lärningsframsteg"}',
 '{"en": "Each card shows a learning path with your completion percentage. Tap any path to see detailed exercises and track your skills development.", "sv": "Varje kort visar en lärningsväg med din slutförandeprocent. Tryck på vilken väg som helst för att se detaljerade övningar och spåra din färdighetsutveckling."}',
 NULL, '📊', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ProgressScreen.FirstPath', NULL, 'center'),

-- 3. Additional Path Card (targets second path card line #4634)
('c3333333-3333-3333-3333-333333333333', 'tour.screen.progress.pathcard', 'tour', ARRAY['mobile'],
 '{"en": "Explore Learning Paths", "sv": "Utforska Lärningsvägar"}',
 '{"en": "Each learning path focuses on different driving skills. Browse through them to find content that matches your goals and experience level.", "sv": "Varje lärningsväg fokuserar på olika körfärdigheter. Bläddra igenom dem för att hitta innehåll som matchar dina mål och erfarenhetsnivå."}',
 NULL, '🎯', '#00E6C3', 3, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ProgressScreen.PathCard', NULL, 'center'),

-- 4. Exercise Selection (targets first exercise item line #4125)
('d4444444-4444-4444-4444-444444444444', 'tour.screen.progress.exercise', 'tour', ARRAY['mobile'],
 '{"en": "Select Exercises", "sv": "Välj Övningar"}',
 '{"en": "Tap any exercise to see detailed instructions, media content, and track your completion progress. Each exercise builds specific driving skills.", "sv": "Tryck på vilken övning som helst för att se detaljerade instruktioner, medieinnehåll och spåra dina slutförandeframsteg. Varje övning bygger specifika körfärdigheter."}',
 NULL, '📚', '#00E6C3', 4, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ProgressScreen.ExerciseItem', NULL, 'center'),

-- EXERCISE DETAIL TOURS (2 steps)
-- 5. Mark Exercise Complete (targets mark complete button line #3774)
('e5555555-5555-5555-5555-555555555555', 'tour.screen.exercise.complete', 'tour', ARRAY['mobile'],
 '{"en": "Mark Exercise Complete", "sv": "Markera Övning Som Slutförd"}',
 '{"en": "Tap here to mark this exercise as completed! This tracks your progress and unlocks new learning content.", "sv": "Tryck här för att markera denna övning som slutförd! Detta spårar dina framsteg och låser upp nytt lärningsinnehåll."}',
 NULL, '✅', '#00E6C3', 1, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ExerciseDetail.MarkCompleteButton', NULL, 'center'),

-- 6. Practice Repetitions (targets repeat section line #3556)
('f6666666-6666-6666-6666-666666666666', 'tour.screen.exercise.repeats', 'tour', ARRAY['mobile'],
 '{"en": "Practice Repetitions", "sv": "Övningsrepetitioner"}',
 '{"en": "Some exercises require multiple repetitions to master. Track your progress through each repetition here.", "sv": "Vissa övningar kräver flera repetitioner för att bemästra. Spåra dina framsteg genom varje repetition här."}',
 NULL, '🔄', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ExerciseDetail.RepeatSection', NULL, 'center'),

-- ROUTEDETAILSCREEN TOURS (3 steps)
-- 7. Save Route Button
('a7777777-7777-7777-7777-777777777777', 'tour.screen.route_detail.save', 'tour', ARRAY['mobile'],
 '{"en": "Save This Route", "sv": "Spara Denna Rutt"}',
 '{"en": "Bookmark routes you like! Tap here to save this route to your personal collection for easy access later.", "sv": "Bokmärk rutter du gillar! Tryck här för att spara denna rutt till din personliga samling för enkel åtkomst senare."}',
 NULL, '🔖', '#00E6C3', 1, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'RouteDetailScreen.SaveButton', NULL, 'center'),

-- 8. Interactive Route Map
('b8888888-8888-8888-8888-888888888888', 'tour.screen.route_detail.map', 'tour', ARRAY['mobile'],
 '{"en": "Interactive Route Map", "sv": "Interaktiv Ruttkarta"}',
 '{"en": "This shows the exact route path with waypoints. You can explore the route visually before driving it.", "sv": "Detta visar den exakta ruttvägen med vägpunkter. Du kan utforska rutten visuellt innan du kör den."}',
 NULL, '🗺️', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'RouteDetailScreen.MapCard', NULL, 'center'),

-- 9. Practice Exercises
('c9999999-9999-9999-9999-999999999999', 'tour.screen.route_detail.exercises', 'tour', ARRAY['mobile'],
 '{"en": "Practice Exercises", "sv": "Övningsexerciser"}',
 '{"en": "Complete these exercises to improve specific driving skills along this route. Track your progress and master each technique!", "sv": "Slutför dessa övningar för att förbättra specifika körfärdigheter längs denna rutt. Spåra dina framsteg och bemästra varje teknik!"}',
 NULL, '📚', '#00E6C3', 3, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'RouteDetailScreen.ExercisesCard', NULL, 'center'),

-- MAPSCREEN TOURS (2 steps - NEW!)
-- 10. Map View with Pins
('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tour.screen.map.pins', 'tour', ARRAY['mobile'],
 '{"en": "Explore Route Pins", "sv": "Utforska Ruttpins"}',
 '{"en": "Each pin represents a driving route created by the community. Tap any pin to see route details, difficulty level, and user reviews.", "sv": "Varje pin representerar en körrutt skapad av gemenskapen. Tryck på vilken pin som helst för att se ruttdetaljer, svårighetsgrad och användarrecensioner."}',
 NULL, '📍', '#00E6C3', 1, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'MapScreen.MapView', NULL, 'center'),

-- 11. Routes Drawer
('ebbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tour.screen.map.drawer', 'tour', ARRAY['mobile'],
 '{"en": "Browse Routes List", "sv": "Bläddra Ruttlista"}',
 '{"en": "Swipe up this drawer to browse all available routes in your area. Filter by difficulty, type, or distance to find the perfect practice route.", "sv": "Svep upp denna låda för att bläddra bland alla tillgängliga rutter i ditt område. Filtrera efter svårighet, typ eller avstånd för att hitta den perfekta övningsrutten."}',
 NULL, '📋', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'MapScreen.RoutesDrawer', NULL, 'bottom');

-- Verification query for improved screen tours
SELECT 
  'IMPROVED SCREEN TOURS VERIFICATION' as section,
  id,
  key,
  title->>'en' as english_title,
  target,
  order_index,
  active
FROM "public"."content" 
WHERE content_type = 'tour' 
  AND key LIKE 'tour.screen.%'
ORDER BY 
  CASE 
    WHEN key LIKE 'tour.screen.progress.%' THEN 1
    WHEN key LIKE 'tour.screen.exercise.%' THEN 2 
    WHEN key LIKE 'tour.screen.route_detail.%' THEN 3
    WHEN key LIKE 'tour.screen.map.%' THEN 4
    ELSE 5
  END,
  order_index;
