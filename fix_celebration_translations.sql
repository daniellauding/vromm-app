-- STEP 1: Delete any existing celebration translations to avoid conflicts
DELETE FROM translations WHERE key IN (
  'celebration.lessonComplete',
  'celebration.greatJob'
);

-- STEP 2: Insert fresh celebration translations
INSERT INTO translations (key, language, value, platform, created_at, updated_at) VALUES
('celebration.lessonComplete', 'en', 'Lesson complete!', 'mobile', NOW(), NOW()),
('celebration.lessonComplete', 'sv', 'Lektion klar!', 'mobile', NOW(), NOW()),
('celebration.greatJob', 'en', 'Great job completing the lesson. You are one step further in your driving license journey', 'mobile', NOW(), NOW()),
('celebration.greatJob', 'sv', 'Bra jobbat med att slutföra lektionen. Du är ett steg närmare ditt körkort', 'mobile', NOW(), NOW());

-- STEP 3: Verify they were inserted
SELECT key, language, value FROM translations 
WHERE key IN ('celebration.lessonComplete', 'celebration.greatJob')
ORDER BY key, language;

