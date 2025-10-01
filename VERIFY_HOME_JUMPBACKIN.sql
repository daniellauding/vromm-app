-- Verify home.jumpBackIn translation exists
SELECT 
  id,
  key,
  language,
  value,
  platform,
  updated_at
FROM translations
WHERE key = 'home.jumpBackIn'
ORDER BY language;

