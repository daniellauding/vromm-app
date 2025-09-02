-- CONDITIONAL TOURS FOR INSTRUCTORS WITH STUDENTS
-- Copy-paste this SQL to add conditional tour steps

-- Step 1: Insert conditional tour steps for instructors
INSERT INTO "public"."content" (
  "id", "key", "content_type", "platforms", "title", "body", 
  "image_url", "icon", "icon_color", "order_index", "active", 
  "created_at", "updated_at", "images", "has_language_images", 
  "icon_svg", "embed_code", "youtube_embed", "iframe_embed", 
  "media_type", "media_enabled", "target", "category_id", "category"
) VALUES 

-- 1. Instructor Student Switch Tour (Header Avatar)
('77777777-7777-7777-7777-777777777777', 'tour.conditional.instructor_student_switch', 'tour', ARRAY['mobile'],
 '{"en": "Switch Between Students", "sv": "Växla Mellan Elever"}',
 '{"en": "As an instructor with multiple students, you can tap your profile avatar to quickly switch between viewing different students'' progress and data. This helps you track each student individually!", "sv": "Som instruktör med flera elever kan du trycka på din profilavatar för att snabbt växla mellan att visa olika elevers framsteg och data. Detta hjälper dig att spåra varje elev individuellt!"}',
 NULL, '👥', '#4B6BFF', 1, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'Header.ProfileAvatar', NULL, 'top-left'),

-- 2. Student Progress Overview  
('88888888-8888-8888-8888-888888888888', 'tour.conditional.instructor_with_students', 'tour', ARRAY['mobile'],
 '{"en": "Monitor Student Progress", "sv": "Övervaka Elevframsteg"}',
 '{"en": "Here you can see your selected student''s learning progress. Each progress card shows their completion status, and you can switch between students to compare their development!", "sv": "Här kan du se din valda elevs lärandeframsteg. Varje framstegskort visar deras slutförandestatus, och du kan växla mellan elever för att jämföra deras utveckling!"}',
 NULL, '📈', '#00E6C3', 2, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'ProgressSection.FirstCard', NULL, 'center'),

-- 3. MapScreen Features for Instructors
('99999999-9999-9999-9999-999999999999', 'tour.conditional.instructor_map_features', 'tour', ARRAY['mobile'],
 '{"en": "Assign Routes to Students", "sv": "Tilldela Rutter till Elever"}',
 '{"en": "Use the map to find suitable practice routes for your students. You can save routes and share them, or create custom routes tailored to each student''s skill level and learning needs.", "sv": "Använd kartan för att hitta lämpliga övningsrutter för dina elever. Du kan spara rutter och dela dem, eller skapa anpassade rutter skräddarsydda för varje elevs kompetensnivå och lärandebehov."}',
 NULL, '🗺️', '#00E6C3', 3, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'MapScreen.RoutesDrawer', NULL, 'center'),

-- 4. RouteDetail Instructor Actions
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tour.conditional.instructor_route_actions', 'tour', ARRAY['mobile'],
 '{"en": "Route Exercises for Students", "sv": "Ruttövningar för Elever"}',
 '{"en": "When viewing route details, you can assign specific exercises to students, track their completion status, and provide feedback. These exercises help students improve specific driving skills.", "sv": "När du visar ruttdetaljer kan du tilldela specifika övningar till elever, spåra deras slutförandestatus och ge feedback. Dessa övningar hjälper elever att förbättra specifika körfärdigheter."}',
 NULL, '📚', '#00E6C3', 4, true, NOW(), NOW(), '{}', false, NULL, NULL, NULL, NULL, 'none', true, 'RouteDetailScreen.ExercisesCard', NULL, 'center');

-- Verification query for conditional tours
SELECT 
  'CONDITIONAL TOURS VERIFICATION' as section,
  id,
  key,
  title->>'en' as english_title,
  target,
  order_index,
  active
FROM "public"."content" 
WHERE content_type = 'tour' 
  AND key LIKE 'tour.conditional.%'
ORDER BY order_index;
