-- Fix Beta Translations - Run this if translations are not appearing
-- This script will verify and fix common issues

-- 1. Check current state
DO $$
DECLARE
  en_count INTEGER;
  sv_count INTEGER;
  mobile_count INTEGER;
  null_platform_count INTEGER;
BEGIN
  -- Count translations by language
  SELECT COUNT(*) INTO en_count
  FROM public.translations
  WHERE key LIKE 'beta.checklist.%' AND language = 'en';
  
  SELECT COUNT(*) INTO sv_count
  FROM public.translations
  WHERE key LIKE 'beta.checklist.%' AND language = 'sv';
  
  -- Count by platform
  SELECT COUNT(*) INTO mobile_count
  FROM public.translations
  WHERE key LIKE 'beta.checklist.%' AND platform = 'mobile';
  
  SELECT COUNT(*) INTO null_platform_count
  FROM public.translations
  WHERE key LIKE 'beta.checklist.%' AND platform IS NULL;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Current Beta Translation Status';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'English translations: %', en_count;
  RAISE NOTICE 'Swedish translations: %', sv_count;
  RAISE NOTICE 'Platform = mobile: %', mobile_count;
  RAISE NOTICE 'Platform = NULL: %', null_platform_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF sv_count = 0 THEN
    RAISE WARNING '❌ No Swedish beta translations found!';
    RAISE WARNING '   Please re-run: sql/beta_testing_checklist_translations.sql';
  END IF;
  
  IF mobile_count + null_platform_count = 0 THEN
    RAISE WARNING '❌ No beta translations with mobile platform found!';
  END IF;
END $$;

-- 2. Fix platform values if needed
-- If translations exist but have wrong platform, fix them
UPDATE public.translations
SET 
  platform = 'mobile',
  updated_at = NOW()
WHERE key LIKE 'beta.checklist.%'
  AND (platform IS NULL OR platform NOT IN ('mobile', 'web'));

-- Get count of updated rows
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Fixed % translations with incorrect platform', updated_count;
  END IF;
END $$;

-- 3. Verify specific test translation exists
DO $$
DECLARE
  test_translation_en TEXT;
  test_translation_sv TEXT;
BEGIN
  -- Check the specific translation that's being tested
  SELECT value INTO test_translation_en
  FROM public.translations
  WHERE key = 'beta.checklist.student.connect_supervisor.title'
    AND language = 'en'
    AND (platform IS NULL OR platform = 'mobile');
  
  SELECT value INTO test_translation_sv
  FROM public.translations
  WHERE key = 'beta.checklist.student.connect_supervisor.title'
    AND language = 'sv'
    AND (platform IS NULL OR platform = 'mobile');
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔍 Test Translation Check';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Key: beta.checklist.student.connect_supervisor.title';
  
  IF test_translation_en IS NOT NULL THEN
    RAISE NOTICE '✅ English: %', test_translation_en;
  ELSE
    RAISE WARNING '❌ English translation NOT FOUND';
  END IF;
  
  IF test_translation_sv IS NOT NULL THEN
    RAISE NOTICE '✅ Swedish: %', test_translation_sv;
  ELSE
    RAISE WARNING '❌ Swedish translation NOT FOUND';
  END IF;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- 4. Show sample of loaded translations
SELECT
  language,
  key,
  LEFT(value, 40) as value_preview,
  platform,
  created_at
FROM public.translations
WHERE key LIKE 'beta.checklist.student.%'
ORDER BY language, key
LIMIT 10;

-- 5. Final summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Verification Complete';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Completely kill and restart the app';
  RAISE NOTICE '2. Check console logs for:';
  RAISE NOTICE '   "Beta checklist translations: XX"';
  RAISE NOTICE '3. If still not working, use the refresh';
  RAISE NOTICE '   button in the Beta Testing Sheet';
  RAISE NOTICE '';
END $$;

