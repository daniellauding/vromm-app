-- SQL translations for GettingStarted event block and ExerciseListSheet
-- Insert these into your translations table with proper UUID format

-- Event creation title and description
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
(gen_random_uuid(), 'home.gettingStarted.createEvent.title', 'en', 'Plan Practice Event', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.gettingStarted.createEvent.title', 'sv', 'Planera Övningsevent', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.gettingStarted.createEvent.description', 'en', 'Create your first practice session or driving event', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.gettingStarted.createEvent.description', 'sv', 'Skapa din första övningssession eller körevent', 'mobile', NOW(), NOW());

-- Status completed text
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
(gen_random_uuid(), 'home.gettingStarted.status.completed', 'en', 'DONE', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.gettingStarted.status.completed', 'sv', 'KLART', 'mobile', NOW(), NOW());

-- ExerciseListSheet translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
(gen_random_uuid(), 'exercises.completed', 'en', 'completed', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'exercises.completed', 'sv', 'avklarade', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'exercises.step', 'en', 'Step', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'exercises.step', 'sv', 'Steg', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'exercises.noExercises', 'en', 'No exercises available', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'exercises.noExercises', 'sv', 'Inga övningar tillgängliga', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'exercises.learningExercises', 'en', 'Learning Exercises', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'exercises.learningExercises', 'sv', 'Lärövningar', 'mobile', NOW(), NOW());

-- Alternative Swedish translations (if preferred):
-- INSERT INTO translations (key, language, value) VALUES
-- ('home.gettingStarted.createEvent.title', 'sv', 'Skapa Övningsevent'),
-- ('home.gettingStarted.createEvent.description', 'sv', 'Planera din första körlektion eller träningsevent');
