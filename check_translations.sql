-- Check if celebration translations exist in database
SELECT key, language, value, platform, created_at 
FROM translations 
WHERE key LIKE 'celebration%' 
ORDER BY key, language;

-- Check all filter translations
SELECT key, language, value, platform 
FROM translations 
WHERE key LIKE 'filters%' 
ORDER BY key, language 
LIMIT 50;

-- Count total translations by language
SELECT language, COUNT(*) as count 
FROM translations 
GROUP BY language;

-- Check if specific keys exist
SELECT key, language, value 
FROM translations 
WHERE key IN (
  'celebration.lessonComplete',
  'celebration.greatJob', 
  'celebration.exercisesCompleted',
  'celebration.continue',
  'filters.seeRoutes',
  'common.reset'
)
ORDER BY key, language;

-- Check recently added translations (last 24 hours)
SELECT key, language, value, created_at 
FROM translations 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

