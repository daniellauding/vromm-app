-- Debug Beta Translation Issues
-- Run this in Supabase SQL Editor to verify translations exist

-- 1. Check total count of beta translations by language
SELECT
  language,
  platform,
  COUNT(*) as total_translations
FROM public.translations
WHERE key LIKE 'beta.checklist.%'
GROUP BY language, platform
ORDER BY language, platform;

-- 2. Check the specific translation that's failing
SELECT
  *
FROM public.translations
WHERE key = 'beta.checklist.student.connect_supervisor.title'
ORDER BY language;

-- 3. Check if there are any duplicates or conflicts
SELECT
  key,
  language,
  platform,
  COUNT(*) as count
FROM public.translations
WHERE key LIKE 'beta.checklist.%'
GROUP BY key, language, platform
HAVING COUNT(*) > 1;

-- 4. Sample some translations to verify content
SELECT
  language,
  key,
  LEFT(value, 50) as value_preview,
  platform,
  created_at
FROM public.translations
WHERE key LIKE 'beta.checklist.student.%'
ORDER BY language, key
LIMIT 20;

