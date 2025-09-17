-- Fix duplicate key constraint violation in translations table
-- This script removes duplicate entries and ensures unique constraints

-- First, let's see what duplicates exist
-- SELECT key, language, platform, COUNT(*) as count
-- FROM translations 
-- WHERE key = 'mapPresets.description' AND language = 'en' AND platform = 'mobile'
-- GROUP BY key, language, platform
-- HAVING COUNT(*) > 1;

-- Remove duplicate entries, keeping only the most recent one
DELETE FROM translations 
WHERE id IN (
    SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (
                   PARTITION BY key, language, platform 
                   ORDER BY created_at DESC, updated_at DESC
               ) as rn
        FROM translations
        WHERE key = 'mapPresets.description' 
          AND language = 'en' 
          AND platform = 'mobile'
    ) t 
    WHERE rn > 1
);

-- Verify the fix
-- SELECT key, language, platform, COUNT(*) as count
-- FROM translations 
-- WHERE key = 'mapPresets.description' AND language = 'en' AND platform = 'mobile'
-- GROUP BY key, language, platform;
