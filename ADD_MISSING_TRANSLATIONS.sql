-- ============================================================================
-- ADD ALL MISSING TRANSLATIONS - RUN THIS NOW!
-- ============================================================================

INSERT INTO translations (key, language, value, platform, created_at, updated_at)
VALUES
  -- Route Collections (MISSING!)
  ('routeCollections.title', 'en', 'Collections', 'mobile', NOW(), NOW()),
  ('routeCollections.title', 'sv', 'Samlingar', 'mobile', NOW(), NOW()),
  ('routeCollections.allRoutes', 'en', 'All Routes', 'mobile', NOW(), NOW()),
  ('routeCollections.allRoutes', 'sv', 'Alla Rutter', 'mobile', NOW(), NOW()),

  -- Content Filters Labels (MISSING!)
  ('filters.content', 'en', 'Content', 'mobile', NOW(), NOW()),
  ('filters.content', 'sv', 'Innehåll', 'mobile', NOW(), NOW()),
  ('filters.hasExercises', 'en', 'Has Exercises', 'mobile', NOW(), NOW()),
  ('filters.hasExercises', 'sv', 'Har Övningar', 'mobile', NOW(), NOW()),
  ('filters.hasMedia', 'en', 'Has Media', 'mobile', NOW(), NOW()),
  ('filters.hasMedia', 'sv', 'Har Media', 'mobile', NOW(), NOW()),
  ('filters.verified', 'en', 'Verified', 'mobile', NOW(), NOW()),
  ('filters.verified', 'sv', 'Verifierad', 'mobile', NOW(), NOW()),

  -- Route Type Labels (MISSING!)
  ('filters.routeType', 'en', 'Route Type', 'mobile', NOW(), NOW()),
  ('filters.routeType', 'sv', 'Rutttyp', 'mobile', NOW(), NOW()),
  ('filters.routeType.recorded', 'en', 'Recorded', 'mobile', NOW(), NOW()),
  ('filters.routeType.recorded', 'sv', 'Inspelad', 'mobile', NOW(), NOW()),
  ('filters.routeType.waypoint', 'en', 'Waypoint', 'mobile', NOW(), NOW()),
  ('filters.routeType.waypoint', 'sv', 'Vägpunkt', 'mobile', NOW(), NOW()),
  ('filters.routeType.pen', 'en', 'Pen', 'mobile', NOW(), NOW()),
  ('filters.routeType.pen', 'sv', 'Penna', 'mobile', NOW(), NOW()),

  -- Sort Labels (MISSING!)
  ('filters.sortBy', 'en', 'Sort By', 'mobile', NOW(), NOW()),
  ('filters.sortBy', 'sv', 'Sortera Efter', 'mobile', NOW(), NOW()),
  ('filters.sort.best_match', 'en', 'Best Match', 'mobile', NOW(), NOW()),
  ('filters.sort.best_match', 'sv', 'Bästa Matchning', 'mobile', NOW(), NOW()),
  ('filters.sort.most_popular', 'en', 'Most Popular', 'mobile', NOW(), NOW()),
  ('filters.sort.most_popular', 'sv', 'Mest Populära', 'mobile', NOW(), NOW()),
  ('filters.sort.closest', 'en', 'Closest', 'mobile', NOW(), NOW()),
  ('filters.sort.closest', 'sv', 'Närmast', 'mobile', NOW(), NOW()),
  ('filters.sort.newly_added', 'en', 'Newly Added', 'mobile', NOW(), NOW()),
  ('filters.sort.newly_added', 'sv', 'Nyligen Tillagda', 'mobile', NOW(), NOW()),
  ('filters.sort.newest', 'en', 'Newest', 'mobile', NOW(), NOW()),
  ('filters.sort.newest', 'sv', 'Nyaste', 'mobile', NOW(), NOW()),
  ('filters.sort.my_created', 'en', 'My Created', 'mobile', NOW(), NOW()),
  ('filters.sort.my_created', 'sv', 'Mina Skapade', 'mobile', NOW(), NOW()),
  ('filters.sort.best_review', 'en', 'Best Review', 'mobile', NOW(), NOW()),
  ('filters.sort.best_review', 'sv', 'Bästa Recension', 'mobile', NOW(), NOW()),
  ('filters.sort.has_image', 'en', 'Has Image', 'mobile', NOW(), NOW()),
  ('filters.sort.has_image', 'sv', 'Har Bild', 'mobile', NOW(), NOW()),

  -- Min Rating (MISSING!)
  ('filters.minRating', 'en', 'Minimum Rating', 'mobile', NOW(), NOW()),
  ('filters.minRating', 'sv', 'Minsta Betyg', 'mobile', NOW(), NOW()),
  ('filters.allRatings', 'en', 'All', 'mobile', NOW(), NOW()),
  ('filters.allRatings', 'sv', 'Alla', 'mobile', NOW(), NOW())

ON CONFLICT (key, language) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- VERIFY THEY EXIST NOW
SELECT 'SUCCESS - All missing translations added!' as status;

-- Count total filter translations
SELECT COUNT(*) as total_filter_translations
FROM translations
WHERE key LIKE 'filters.%' OR key LIKE 'routeCollections.%';

-- Show sample
SELECT key, language, value
FROM translations
WHERE key IN (
  'routeCollections.title',
  'filters.sort.best_match',
  'filters.hasExercises',
  'filters.routeType.recorded'
)
ORDER BY key, language;

