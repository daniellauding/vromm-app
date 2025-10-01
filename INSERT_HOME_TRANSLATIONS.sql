-- Insert missing home.* translations
-- Run VERIFY_HOME_TRANSLATIONS.sql first to check which ones are missing

-- home.jumpBackIn
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.jumpBackIn', 'en', 'Jump back in', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.jumpBackIn', 'sv', 'Fortsätt där du slutade', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.featuredContent
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.featuredContent', 'en', 'Featured Learning', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.featuredContent', 'sv', 'Utvalda Lärpaket', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.noFeaturedContent
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.noFeaturedContent', 'en', 'No featured content yet', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.noFeaturedContent', 'sv', 'Inget utvalt innehåll ännu', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.featuredContentDescription
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.featuredContentDescription', 'en', 'Featured learning paths and exercises will appear here', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.featuredContentDescription', 'sv', 'Utvalda lärpaket och övningar kommer att visas här', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.learningPath
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.learningPath', 'en', 'Learning Path', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.learningPath', 'sv', 'Lärpaket', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.startLearning
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.startLearning', 'en', 'Start Learning', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.startLearning', 'sv', 'Börja lära', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.exercise
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.exercise', 'en', 'Exercise', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.exercise', 'sv', 'Övning', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.startExercise
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.startExercise', 'en', 'Start Exercise', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.startExercise', 'sv', 'Börja övning', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.cityRoutes.selectCity
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.cityRoutes.selectCity', 'en', 'Select a city', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.cityRoutes.selectCity', 'sv', 'Välj en stad', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.cityRoutes.noRoutesInCity
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.cityRoutes.noRoutesInCity', 'en', 'No Routes in This City', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.cityRoutes.noRoutesInCity', 'sv', 'Inga rutter i denna stad', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.cityRoutes.noRoutesMessage
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.cityRoutes.noRoutesMessage', 'en', 'No practice routes found in {city}. Be the first to create one or explore other cities!', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.cityRoutes.noRoutesMessage', 'sv', 'Inga övningsrutter hittades i {city}. Bli den första att skapa en eller utforska andra städer!', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.cityRoutes.createRouteHere
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.cityRoutes.createRouteHere', 'en', 'Create Route Here', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.cityRoutes.createRouteHere', 'sv', 'Skapa rutt här', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- home.cityRoutes.changeCity
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.cityRoutes.changeCity', 'en', 'Change City', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (gen_random_uuid(), 'home.cityRoutes.changeCity', 'sv', 'Byt stad', 'mobile', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

