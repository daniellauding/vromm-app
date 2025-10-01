-- Verify all home.* translations exist
SELECT 
  id,
  key,
  language,
  value,
  platform,
  updated_at
FROM translations
WHERE key IN (
  'home.jumpBackIn',
  'home.featuredContent',
  'home.noFeaturedContent',
  'home.featuredContentDescription',
  'home.learningPath',
  'home.startLearning',
  'home.exercise',
  'home.startExercise',
  'home.cityRoutes.selectCity',
  'home.cityRoutes.noRoutesInCity',
  'home.cityRoutes.noRoutesMessage',
  'home.cityRoutes.createRouteHere',
  'home.cityRoutes.changeCity'
)
ORDER BY key, language;

