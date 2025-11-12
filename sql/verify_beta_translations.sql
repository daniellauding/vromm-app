-- Verify Beta Testing Checklist Translations
-- Run this to check if translations were inserted correctly

-- Check total count of beta checklist translations
SELECT 
  language,
  COUNT(*) as total_translations
FROM public.translations
WHERE key LIKE 'beta.checklist.%'
GROUP BY language
ORDER BY language;

-- Check a few sample translations (student checklist)
SELECT 
  language,
  key,
  value
FROM public.translations
WHERE key LIKE 'beta.checklist.student.%'
ORDER BY language, key;

-- Check if the translations table exists and has the right structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'translations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

