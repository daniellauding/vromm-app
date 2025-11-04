-- USE THIS - UPSERT will work even if rows exist!

-- Delete old ones first to be safe
DELETE FROM translations WHERE key IN ('celebration.lessonComplete', 'celebration.greatJob');

-- Now insert with ON CONFLICT to handle any unique constraints
INSERT INTO translations (key, language, value, platform, created_at, updated_at)
VALUES
  ('celebration.lessonComplete', 'en', 'Lesson complete!', 'mobile', NOW(), NOW()),
  ('celebration.lessonComplete', 'sv', 'Lektion klar!', 'mobile', NOW(), NOW()),
  ('celebration.greatJob', 'en', 'Great job completing the lesson. You are one step further in your driving license journey', 'mobile', NOW(), NOW()),
  ('celebration.greatJob', 'sv', 'Bra jobbat med att slutföra lektionen. Du är ett steg närmare ditt körkort', 'mobile', NOW(), NOW())
ON CONFLICT (key, language) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify
SELECT 'SUCCESS - Translations inserted/updated' as status;
SELECT key, language, value FROM translations WHERE key LIKE 'celebration%' ORDER BY key, language;

