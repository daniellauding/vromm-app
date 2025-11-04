-- FINAL TRANSLATION FIX - Run this in Supabase SQL Editor

-- STEP 1: Check if table has unique constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'translations';

-- STEP 2: Delete ANY existing celebration keys (in case they exist with different IDs)
DELETE FROM translations 
WHERE key IN ('celebration.lessonComplete', 'celebration.greatJob');

-- STEP 3: Insert with generated UUIDs (avoiding ID conflicts)
INSERT INTO translations (key, language, value, platform, created_at, updated_at) VALUES
('celebration.lessonComplete', 'en', 'Lesson complete!', 'mobile', NOW(), NOW()),
('celebration.lessonComplete', 'sv', 'Lektion klar!', 'mobile', NOW(), NOW()),
('celebration.greatJob', 'en', 'Great job completing the lesson. You are one step further in your driving license journey', 'mobile', NOW(), NOW()),
('celebration.greatJob', 'sv', 'Bra jobbat med att slutföra lektionen. Du är ett steg närmare ditt körkort', 'mobile', NOW(), NOW());

-- STEP 4: VERIFY they exist now
SELECT key, language, value, created_at 
FROM translations 
WHERE key IN ('celebration.lessonComplete', 'celebration.greatJob')
ORDER BY key, language;

-- STEP 5: Check total count
SELECT COUNT(*) as total_translations FROM translations;

